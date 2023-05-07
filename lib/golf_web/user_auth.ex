defmodule GolfWeb.UserAuth do
  use GolfWeb, :verified_routes
  import Plug.Conn

  alias Golf.Users
  alias Golf.Users.UserToken

  # 60 days
  @max_age 60 * 60 * 24 * 60
  @user_cookie "_golf_web_user"
  @salt "user auth"
  @cookie_options [sign: true, max_age: @max_age, same_site: "Lax"]

  def fetch_user(conn, _) do
    # check if token in session
    if token = get_session(conn, :user_token) do
      user = Users.get_user_by_token(token)

      conn
      |> assign(:user_id, user.id)
      |> assign(:user_token, token)
    else
      conn = fetch_cookies(conn, signed: @user_cookie)

      # check if token in cookies
      if token = conn.cookies[@user_cookie] do
        user = Users.get_user_by_token(token)

        conn
        |> assign(:user_id, user.id)
        |> assign(:user_token, token)
        |> put_session(:user_token, token)
      else
        # otherwise, create a new user and token
        {:ok, user} = Users.create_user()
        token = Phoenix.Token.sign(conn, @salt, user.id, @cookie_options)

        {:ok, _} =
          %UserToken{user_id: user.id, token: token}
          |> Users.insert_user_token()

        conn
        |> assign(:user_id, user.id)
        |> assign(:user_token, token)
        |> put_session(:user_token, token)
        |> put_resp_cookie(@user_cookie, token, @cookie_options)
      end
    end
  end
end
