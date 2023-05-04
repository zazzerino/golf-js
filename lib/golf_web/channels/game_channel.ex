defmodule GolfWeb.GameChannel do
  use GolfWeb, :channel
  alias Golf.GamesDb

  @impl true
  def join("game:" <> game_id, _, socket) do
    {game_id, _} = Integer.parse(game_id)
    game = GamesDb.get_game(game_id)
    {:ok, %{game: game}, assign(socket, game: game)}
  end

  @impl true
  def handle_in("start_game", _, socket) do
    game_id = socket.assigns.game.id
    game = GamesDb.get_game(game_id)
    {:ok, %{game: game}} = GamesDb.start_game(game)
    game = GamesDb.get_game(game.id)
    broadcast!(socket, "game_started", %{game: game})
    {:noreply, socket}
  end

  # @impl true
  # def handle_in("ping", payload, socket) do
  #   {:reply, {:ok, payload}, socket}
  # end

  # @impl true
  # def handle_in("shout", payload, socket) do
  #   broadcast(socket, "shout", payload)
  #   {:noreply, socket}
  # end

  # @impl true
  # def join("game:lobby", payload, socket) do
  #   if authorized?(payload) do
  #     {:ok, socket}
  #   else
  #     {:error, %{reason: "unauthorized"}}
  #   end
  # end

  # # Add authorization logic here as required.
  # defp authorized?(_payload) do
  #   true
  # end
end
