defmodule GolfWeb.UserAuth do
  use GolfWeb, :verified_routes
  import Plug.Conn
  alias Golf.Users

  def put_user_id(conn, _) do
    if user_id = get_session(conn, :user_id) do
      assign(conn, :user_id, user_id)
    else
      {:ok, user} = Golf.Users.create_user()

      conn
      |> assign(:user_id, user.id)
      |> put_session(:user_id, user.id)
    end
  end

  def put_user_token(conn, _) do
    if user_id = conn.assigns[:user_id] do
      token = Phoenix.Token.sign(conn, "user socket", user_id)
      {:ok, _} = Users.create_user_token(user_id, token)
      assign(conn, :user_token, token)
    else
      conn
    end
  end
end
