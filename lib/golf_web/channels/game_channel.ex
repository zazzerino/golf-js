defmodule GolfWeb.GameChannel do
  use GolfWeb, :channel
  alias Golf.{Games, GamesDb}

  @impl true
  def join("game:" <> game_id, _, socket) do
    user_id = socket.assigns.user_id
    {game_id, _} = Integer.parse(game_id)

    game = GamesDb.get_game(game_id)
    players = GamesDb.get_players(game_id) |> put_scores()
    playable_cards = Games.all_playable_cards(game, players)
    join_requests = GamesDb.get_join_requests(game_id)

    {:ok,
     %{
       user_id: user_id,
       game: game,
       players: players,
       playable_cards: playable_cards,
       join_requests: join_requests
     }, assign(socket, game: game, players: players)}
  end

  @impl true
  def handle_in("start_game", _, socket) do
    game = socket.assigns.game
    # players = socket.assigns.players
    players = GamesDb.get_players(game.id)
    {:ok, _} = GamesDb.start_game(game, players)

    game = GamesDb.get_game(game.id)
    players = GamesDb.get_players(game.id) |> put_scores()
    IO.inspect(players, label: "PLAYAS")
    playable_cards = Games.all_playable_cards(game, players)

    broadcast!(socket, "game_started", %{
      game: game,
      players: players,
      playable_cards: playable_cards
    })

    {:noreply, assign(socket, game: game, players: players)}
  end

  @impl true
  def handle_in("game_event", payload, socket) do
    game = socket.assigns.game
    players = socket.assigns.players
    payload = payload |> to_atom_key_map() |> action_to_atom()
    event = struct(Golf.Games.Event, payload)

    {:ok, _} = GamesDb.handle_game_event(game, event, players)

    game = GamesDb.get_game(game.id)
    players = GamesDb.get_players(game.id) |> put_scores()
    playable_cards = Games.all_playable_cards(game, players)

    broadcast!(socket, "game_event", %{
      game: game,
      players: players,
      playable_cards: playable_cards
    })

    {:noreply, assign(socket, game: game, players: players)}
  end

  @impl true
  def handle_in("request_join", payload, socket) do
    request = struct(Golf.Games.JoinRequest, to_atom_key_map(payload))
    {:ok, request} = GamesDb.insert_join_request(request)

    username = Golf.Users.get_username(request.user_id)
    request = Map.put(request, :username, username)

    broadcast!(socket, "join_request", request)
    {:noreply, socket}
  end

  @impl true
  def handle_in("confirm_join", %{"request_id" => request_id}, socket) do
    game = socket.assigns.game

    {request_id, _} = Integer.parse(request_id)
    join_request = GamesDb.get_join_request(request_id)
    num_players = GamesDb.get_num_players(game.id)

    {:ok, %{player: player}} = GamesDb.confirm_join_request(game, join_request, num_players)
    username = Golf.Users.get_username(player.user_id)
    player = Map.put(player, :username, username) |> put_score()

    broadcast!(socket, "player_joined", %{player: player})
    {:noreply, socket}
  end

  defp to_atom_key_map(map) do
    for {key, val} <- map, into: %{} do
      {String.to_existing_atom(key), val}
    end
  end

  defp action_to_atom(map) do
    Map.update!(map, :action, &String.to_existing_atom/1)
  end

  defp put_score(player) do
    Map.put(player, :score, Games.score(player.hand))
  end

  defp put_scores(players) do
    Enum.map(players, &put_score/1)
  end
end
