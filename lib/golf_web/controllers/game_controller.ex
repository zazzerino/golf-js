defmodule GolfWeb.GameController do
  use GolfWeb, :controller
  alias Golf.GamesDb

  def show(conn, %{"id" => game_id}) do
    with {game_id, _} <- Integer.parse(game_id),
         game when is_struct(game) <- GamesDb.get_game(game_id) do
      render(conn, :show, page_title: "Game", game: game)
    else
      _ ->
        conn
        |> put_flash(:error, "Game #{game_id} not found.")
        |> redirect(to: ~p"/")
    end
  end

  def create(conn, _) do
    user_id = conn.assigns.user_id
    {:ok, %{game: game}} = GamesDb.create_game(user_id)

    conn
    |> put_flash(:info, "Game #{game.id} created.")
    |> redirect(to: ~p"/games/#{game.id}")
  end
end
