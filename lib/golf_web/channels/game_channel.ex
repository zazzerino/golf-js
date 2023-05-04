defmodule GolfWeb.GameChannel do
  use GolfWeb, :channel
  alias Golf.GamesDb

  @impl true
  def join("game:" <> game_id, _, socket) do
    {game_id, _} = Integer.parse(game_id)
    game = GamesDb.get_game(game_id)
    {:ok, %{game: game}, assign(socket, game_id: game_id, game: game)}
  end

  @impl true
  def handle_in("start_game", _, socket) do
    game = socket.assigns.game
    {:ok, _} = GamesDb.start_game(game)

    game = GamesDb.get_game(game.id)
    broadcast!(socket, "game_started", %{game: game})

    {:noreply, assign(socket, game: game)}
  end

  @impl true
  def handle_in("game_event", payload, socket) do
    game_id = socket.assigns.game_id
    payload = payload |> to_atom_key_map() |> action_to_atom()
    event = struct(Golf.Games.Event, payload)

    game = GamesDb.get_game(game_id)
    {:ok, multi} = GamesDb.handle_game_event(game, event)

    game = GamesDb.get_game(game_id)
    broadcast!(socket, "game_event", %{game: game, updates: multi})
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
end
