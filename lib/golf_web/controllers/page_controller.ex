defmodule GolfWeb.PageController do
  use GolfWeb, :controller

  def home(conn, _) do
    render(conn, :home, page_title: "Home")
  end

  def settings(conn, _) do
    user_id = conn.assigns.user_id
    user = Golf.Users.get_user(user_id)
    render(conn, :settings, page_title: "Settings", user: user)
  end

  def update_username(conn, %{"username" => username}) do
    user_id = conn.assigns.user_id
    {1, [_]} = Golf.Users.update_username(user_id, username)

    conn
    |> put_flash(:info, "Username updated.")
    |> redirect(to: "/settings")
  end
end
