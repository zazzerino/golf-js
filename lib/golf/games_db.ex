defmodule Golf.GamesDb do
  import Ecto.Query, warn: false
  import Golf.Games

  alias Golf.Repo
  alias Golf.Users.User
  alias Golf.Games.{Game, Player, Event, JoinRequest, ChatMessage}

  def players_query(game_id) do
    from p in Player,
      where: [game_id: ^game_id],
      order_by: p.turn,
      join: u in User,
      on: [id: p.user_id],
      select: %Player{p | username: u.username}
  end

  def join_requests_query(game_id) do
    from(jr in JoinRequest,
      where: [game_id: ^game_id, confirmed?: false],
      join: u in User,
      on: [id: jr.user_id],
      order_by: jr.inserted_at,
      select: %JoinRequest{jr | username: u.username}
    )
  end

  def chat_messages_query(game_id) do
    from(cm in ChatMessage,
      where: [game_id: ^game_id],
      join: u in User,
      on: [id: cm.user_id],
      order_by: [desc: cm.inserted_at],
      select: %ChatMessage{cm | username: u.username}
    )
  end

  def game_exists?(game_id) do
    from(g in Game, where: [id: ^game_id])
    |> Repo.exists?()
  end

  def get_num_players(game_id) do
    from(p in Player,
      where: [game_id: ^game_id],
      select: count()
    )
    |> Repo.one()
  end

  # def get_game(game_id) do
  #   Repo.get(Game, game_id)
  #   |> Repo.preload(
  #     players: players_query(game_id),
  #     join_requests: join_requests_query(game_id),
  #     chat_messages: chat_messages_query(game_id)
  #   )
  # end

  def get_game(game_id) do
    Repo.get(Game, game_id)
  end

  def delete_game(game_id) do
    from(g in Game,
      where: [id: ^game_id],
      update: [set: [deleted?: true]]
    )
    |> Repo.update_all([])
  end

  def get_players(game_id) do
    players_query(game_id)
    |> Repo.all()
  end

  def get_join_request(request_id) do
    from(jr in JoinRequest, where: [id: ^request_id])
    |> Repo.one()
  end

  def get_join_requests(game_id) do
    join_requests_query(game_id)
    |> Repo.all()
  end

  def get_user_games(user_id) do
    from(u in User,
      where: [id: ^user_id],
      join: p in Player,
      on: [user_id: u.id],
      join: g in Game,
      on: [id: p.game_id],
      where: g.status != :over,
      where: not g.deleted?,
      order_by: g.inserted_at,
      select: %{
        id: g.id,
        inserted_at: g.inserted_at,
        status: g.status,
        host?: p.host?
      }
    )
    |> Repo.all()
  end

  def create_game(user_id) do
    deck = new_deck(num_decks_to_use()) |> Enum.shuffle()

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:game, %Game{deck: deck})
    |> Ecto.Multi.insert(:player, fn %{game: game} ->
      Ecto.build_assoc(game, :players, %{user_id: user_id, turn: 0, host?: true})
    end)
    |> Repo.transaction()
  end

  def insert_join_request(%JoinRequest{} = join_request) do
    join_request
    |> Repo.insert()
  end

  def confirm_join_request(%Game{} = game, %JoinRequest{} = join_request, num_players) do
    player_turn = num_players

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:player, %Player{
      game_id: game.id,
      user_id: join_request.user_id,
      turn: player_turn
    })
    |> Ecto.Multi.update(:join_request, JoinRequest.changeset(join_request, %{confirmed?: true}))
    |> Repo.transaction()
  end

  def start_game(%Game{status: :init} = game, players) do
    num_cards_to_deal = hand_size() * length(players)
    {cards, deck} = Enum.split(game.deck, num_cards_to_deal)

    {:ok, card, deck} = deal_from_deck(deck)
    table_cards = [card | game.table_cards]

    hands =
      cards
      |> Enum.map(fn name -> %{"name" => name, "face_up?" => false} end)
      |> Enum.chunk_every(hand_size())

    Ecto.Multi.new()
    |> Ecto.Multi.update(
      :game,
      Game.changeset(game, %{status: :flip2, deck: deck, table_cards: table_cards})
    )
    |> update_player_hands(players, hands)
    |> Repo.transaction()
  end

  def handle_game_event(%Game{status: :flip2} = game, %Event{action: :flip} = event, players) do
    player = find_player(players, event.player_id)

    if num_cards_face_up(player.hand) < 2 do
      hand = flip_card(player.hand, event.hand_index)

      Ecto.Multi.new()
      |> Ecto.Multi.insert(:event, event)
      |> Ecto.Multi.update(:player, Player.changeset(player, %{hand: hand}))
      |> Ecto.Multi.update(:game, fn %{player: player} ->
        players = replace_player(players, player)
        status = if all_two_face_up?(players), do: :take, else: :flip2
        Game.changeset(game, %{status: status})
      end)
      |> Repo.transaction()
    else
      {:error, :already_flipped_two}
    end
  end

  def handle_game_event(
        %Game{status: :take} = game,
        %Event{action: :take_from_deck} = event,
        players
      ) do
    player = find_player(players, event.player_id)
    {:ok, card, deck} = deal_from_deck(game.deck)

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{held_card: card}))
    |> Ecto.Multi.update(:game, Game.changeset(game, %{status: :hold, deck: deck}))
    |> Repo.transaction()
  end

  def handle_game_event(
        %Game{status: :take} = game,
        %Event{action: :take_from_table} = event,
        players
      ) do
    player = find_player(players, event.player_id)
    [card | table_cards] = game.table_cards

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{held_card: card}))
    |> Ecto.Multi.update(:game, Game.changeset(game, %{status: :hold, table_cards: table_cards}))
    |> Repo.transaction()
  end

  def handle_game_event(%Game{status: :hold} = game, %Event{action: :discard} = event, players) do
    player = find_player(players, event.player_id)
    card = player.held_card
    table_cards = [card | game.table_cards]

    {status, turn} =
      if one_face_down?(player.hand) do
        {:take, game.turn + 1}
      else
        {:flip, game.turn}
      end

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{held_card: nil}))
    |> Ecto.Multi.update(
      :game,
      Game.changeset(game, %{status: status, table_cards: table_cards, turn: turn})
    )
    |> Repo.transaction()
  end

  def handle_game_event(%Game{status: :flip} = game, %Event{action: :flip} = event, players) do
    player = find_player(players, event.player_id)
    hand = flip_card(player.hand, event.hand_index)

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{hand: hand}))
    |> Ecto.Multi.update(:game, fn %{player: player} ->
      players = replace_player(players, player)

      {status, turn} =
        cond do
          all_players_all_face_up?(players) ->
            {:over, game.turn}

          all_face_up?(player.hand) ->
            {:last_take, game.turn + 1}

          true ->
            {:take, game.turn + 1}
        end

      Game.changeset(game, %{status: status, turn: turn})
    end)
    |> Repo.transaction()
  end

  def handle_game_event(
        %Game{status: :hold} = game,
        %Event{action: :swap} = event,
        players
      ) do
    player = find_player(players, event.player_id)
    {card, hand} = swap_card(player.hand, player.held_card, event.hand_index)
    table_cards = [card | game.table_cards]

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{hand: hand, held_card: nil}))
    |> Ecto.Multi.update(:game, fn %{player: player} ->
      players = replace_player(players, player)

      {status, turn} =
        cond do
          all_players_all_face_up?(players) ->
            {:over, game.turn}

          all_face_up?(player.hand) ->
            {:last_take, game.turn + 1}

          true ->
            {:take, game.turn + 1}
        end

      Game.changeset(game, %{status: status, table_cards: table_cards, turn: turn})
    end)
    |> Repo.transaction()
  end

  def handle_game_event(
        %Game{status: :last_take} = game,
        %Event{action: :take_from_deck} = event,
        players
      ) do
    player = find_player(players, event.player_id)
    {:ok, card, deck} = deal_from_deck(game.deck)

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{held_card: card}))
    |> Ecto.Multi.update(:game, Game.changeset(game, %{status: :last_hold, deck: deck}))
    |> Repo.transaction()
  end

  def handle_game_event(
        %Game{status: :last_take} = game,
        %Event{action: :take_from_table} = event,
        players
      ) do
    player = find_player(players, event.player_id)
    [card | table_cards] = game.table_cards

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{held_card: card}))
    |> Ecto.Multi.update(
      :game,
      Game.changeset(game, %{status: :last_hold, table_cards: table_cards})
    )
    |> Repo.transaction()
  end

  def handle_game_event(
        %Game{status: :last_hold} = game,
        %Event{action: :discard} = event,
        players
      ) do
    player = find_player(players, event.player_id)
    card = player.held_card
    table_cards = [card | game.table_cards]
    other_players = Enum.reject(players, &(&1.id == player.id))

    {status, turn, hand} =
      if all_players_all_face_up?(other_players) do
        {:over, game.turn, flip_all(player.hand)}
      else
        {:last_take, game.turn + 1, player.hand}
      end

    Ecto.Multi.new()
    |> Ecto.Multi.insert(:event, event)
    |> Ecto.Multi.update(:player, Player.changeset(player, %{held_card: nil, hand: hand}))
    |> Ecto.Multi.update(
      :game,
      Game.changeset(game, %{status: status, table_cards: table_cards, turn: turn})
    )
    |> Repo.transaction()
  end

  defp update_player_hands(multi, players, hands) do
    changesets =
      Enum.zip(players, hands)
      |> Enum.map(fn {player, hand} -> Player.changeset(player, %{hand: hand}) end)

    Enum.reduce(changesets, multi, fn cs, multi ->
      Ecto.Multi.update(multi, {:player, cs.data.id}, cs)
    end)
  end

  defp replace_player(players, player) do
    Enum.map(
      players,
      fn p -> if p.id == player.id, do: player, else: p end
    )
  end

  defp find_player(players, player_id) do
    Enum.find(players, &(&1.id == player_id))
  end

  # pubsub broadcasts

  # def broadcast_game_created(game_id) do
  #   Phoenix.PubSub.broadcast(Golf.PubSub, "games", {:game_created, game_id})
  # end

  # def broadcast_player_joined(game_id, player) do
  #   Phoenix.PubSub.broadcast(Golf.PubSub, "game:#{game_id}", {:player_joined, player})
  # end

  # def broadcast_game_started(game_id) do
  #   game = get_game(game_id)
  #   Phoenix.PubSub.broadcast(Golf.PubSub, "game:#{game_id}", {:game_started, game})
  # end

  # def broadcast_game_event(game_id) do
  #   game = get_game(game_id)
  #   Phoenix.PubSub.broadcast(Golf.PubSub, "game:#{game_id}", {:game_event, game})
  # end

  # def broadcast_join_request(%JoinRequest{} = request) do
  #   Phoenix.PubSub.broadcast(
  #     Golf.PubSub,
  #     "game:#{request.game_id}",
  #     {:join_request, request}
  #   )
  # end

  # def broadcast_chat_message(message_id) do
  #   message = get_chat_message(message_id)
  #   Phoenix.PubSub.broadcast(Golf.PubSub, "game:#{message.game_id}", {:chat_message, message})
  # end

  # # db queries

  # def player_query(game_id, user_id) do
  #   from p in Player, where: [game_id: ^game_id, user_id: ^user_id]
  # end

  # def get_player(game_id, user_id) do
  #   player_query(game_id, user_id)
  #   |> Repo.one()
  # end

  # def get_unconfirmed_join_requests(game_id) do
  #   unconfirmed_join_requests_query(game_id)
  #   |> Repo.all()
  # end

  # def get_chat_message(message_id) do
  #   from(cm in ChatMessage,
  #     where: [id: ^message_id],
  #     join: u in User,
  #     on: [id: cm.user_id],
  #     select: %ChatMessage{cm | username: u.username}
  #   )
  #   |> Repo.one()
  # end

  # # db updates

  # def insert_chat_message(%ChatMessage{} = message) do
  #   {:ok, message} = Repo.insert(message)
  #   broadcast_chat_message(message.id)
  #   {:ok, message}
  # end

  # def last_event_query(game_id) do
  #   from e in Event,
  #     where: [game_id: ^game_id],
  #     order_by: [desc: e.inserted_at],
  #     limit: 1
  # end
end
