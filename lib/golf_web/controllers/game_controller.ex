defmodule GolfWeb.GameController do
  use GolfWeb, :controller

  def show(conn, %{"id" => game_id}) do
    with {game_id, _} <- Integer.parse(game_id) do
      render(conn, :show, page_title: "Game", game_id: game_id)
    else
      _ ->
        conn
        |> put_flash(:error, "Game #{game_id} not found.")
        |> redirect(to: ~p"/")
    end
  end
end
