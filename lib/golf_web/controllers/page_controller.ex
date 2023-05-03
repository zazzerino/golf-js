defmodule GolfWeb.PageController do
  use GolfWeb, :controller

  def home(conn, _params) do
    # IO.inspect(conn.assigns, label: "ASSIGNS")
    # IO.inspect(get_session(conn), label: "SESSION")
    # IO.inspect(fetch_cookies(conn).cookies, label: "COOKIES")
    render(conn, :home, page_title: "Home")
  end
end
