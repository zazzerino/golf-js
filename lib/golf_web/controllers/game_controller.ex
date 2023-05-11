defmodule GolfWeb.GameController do
  use GolfWeb, :controller
  alias Golf.GamesDb

  def index(conn, _) do
    user_id = conn.assigns.user_id
    games =
      GamesDb.get_user_games(user_id)
      |> Enum.map(&format_inserted_at/1)

    render(conn, :index,
      page_title: "Games",
      games: games)
  end

  def create(conn, _) do
    user_id = conn.assigns.user_id
    {:ok, %{game: game}} = GamesDb.create_game(user_id)

    conn
    |> put_flash(:info, "Game #{game.id} created.")
    |> redirect(to: ~p"/games/#{game.id}")
  end

  def show(conn, %{"id" => game_id}) do
    with {game_id, _} <- Integer.parse(game_id),
         true <- GamesDb.game_exists?(game_id),
         join_requests <- GamesDb.get_join_requests(game_id) do
      render(conn, :show,
        page_title: "Game",
        game_id: game_id,
        join_requests: join_requests
      )
    else
      _ ->
        conn
        |> put_flash(:error, "Game #{game_id} not found.")
        |> redirect(to: ~p"/")
    end
  end

  def delete(conn, %{"id" => game_id}) do
    {game_id, _} = Integer.parse(game_id)
    {1, _} = GamesDb.delete_game(game_id)

    conn
    |> put_flash(:info, "Game #{game_id} deleted.")
    |> redirect(to: ~p"/games")
  end

  defp format_inserted_at(game) do
    Map.update!(game, :inserted_at, &format_datetime/1)
  end

  defp format_datetime(datetime) do
    Calendar.strftime(datetime, "%b %d, %H:%S")
  end
end
