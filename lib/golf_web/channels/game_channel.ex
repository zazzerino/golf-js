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
    payload = payload |> to_atom_key_map() |> put_action_atom()
    event = struct(Golf.Games.Event, payload)
    game = GamesDb.get_game(socket.assigns.game_id)
    GamesDb.handle_event(game, event)
    {:noreply, socket}
  end

  defp to_atom_key_map(string_key_map) do
    for {key, val} <- string_key_map, into: %{} do
      {String.to_existing_atom(key), val}
    end
  end

  defp put_action_atom(map) do
    Map.update!(map, :action, &String.to_existing_atom/1)
  end
end
