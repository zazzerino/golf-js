defmodule GolfWeb.PageController do
  use GolfWeb, :controller

  def home(conn, _) do
    render(conn, :home, page_title: "Home")
  end

  # def settings(conn, _) do
  # end
end
