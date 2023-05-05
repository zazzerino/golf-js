defmodule GolfWeb.GameChannel do
  use GolfWeb, :channel
  alias Golf.{Games, GamesDb}

  @impl true
  def join("game:" <> game_id, _, socket) do
    user_id = socket.assigns.user_id
    {game_id, _} = Integer.parse(game_id)

    game = GamesDb.get_game(game_id)
    players = GamesDb.get_players(game_id)
    # player = Enum.find(players, &(&1.user_id == user_id))
    playable_cards = Games.all_playable_cards(game, players)

    {:ok,
     %{user_id: user_id, game: game, players: players, playable_cards: playable_cards},
     assign(socket, game: game, players: players)
    }
  end

  @impl true
  def handle_in("start_game", _, socket) do
    # user_id = socket.assigns.user_id
    game = socket.assigns.game
    players = socket.assigns.players
    {:ok, _} = GamesDb.start_game(game, players)

    game = GamesDb.get_game(game.id)
    players = GamesDb.get_players(game.id)
    # player = Enum.find(players, &(&1.user_id == user_id))
    playable_cards = Games.all_playable_cards(game, players)
    broadcast!(socket, "game_started", %{game: game, players: players, playable_cards: playable_cards})

    {:noreply, assign(socket, game: game, players: players)}
  end

  @impl true
  def handle_in("game_event", payload, socket) do
    # user_id = socket.assigns.user_id
    game = socket.assigns.game
    players = socket.assigns.players
    payload = payload |> to_atom_key_map() |> action_to_atom()
    event = struct(Golf.Games.Event, payload)

    {:ok, _} = GamesDb.handle_game_event(game, players, event)

    game = GamesDb.get_game(game.id)
    players = GamesDb.get_players(game.id)
    # player = Enum.find(players, &(&1.user_id == user_id))
    playable_cards = Games.all_playable_cards(game, players)
    broadcast!(socket, "game_event", %{game: game, players: players, playable_cards: playable_cards})

    {:noreply, assign(socket, game: game, players: players)}
  end

  # defp get_game_data(game_id) do
  #   game = GamesDb.get_game(game_id)
  #   players = GamesDb.get_players(game_id)
  #   playable_cards = Games.all_playable_cards(Map.put(game, :players, players))
  #   %{game: game, players: players, playable_cards: playable_cards}
  # end

  defp to_atom_key_map(map) do
    for {key, val} <- map, into: %{} do
      {String.to_existing_atom(key), val}
    end
  end

  defp action_to_atom(map) do
    Map.update!(map, :action, &String.to_existing_atom/1)
  end
end
