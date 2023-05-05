defmodule GolfWeb.GameChannel do
  use GolfWeb, :channel
  alias Golf.{Games, GamesDb}

  @impl true
  def join("game:" <> game_id, _, socket) do
    user_id = socket.assigns.user_id
    {game_id, _} = Integer.parse(game_id)
    game = GamesDb.get_game(game_id)
    playable_cards = Games.all_playable_cards(game)
    {:ok, %{game: game, user_id: user_id, playable_cards: playable_cards}, assign(socket, game_id: game_id, game: game)}
  end

  @impl true
  def handle_in("start_game", _, socket) do
    game = socket.assigns.game
    {:ok, _} = GamesDb.start_game(game)

    game = GamesDb.get_game(game.id)
    playable_cards = Games.all_playable_cards(game)
    broadcast!(socket, "game_started", %{game: game, playable_cards: playable_cards})

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
    playable_cards = Games.all_playable_cards(game)
    broadcast!(socket, "game_event", %{game: game, playable_cards: playable_cards, updates: multi})

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
