defmodule GolfWeb.Plugs do
  # import Plug.Conn
  # alias Golf.Users

  # def put_user_id(conn, _) do
  #   with user_id when is_integer(user_id) <- get_session(conn, "user_id"),
  #        user when is_struct(user) <- Users.get_user(user_id) do
  #     conn
  #   else
  #     _ ->
  #       {:ok, user} = Users.create_user()
  #       put_session(conn, "user_id", user.id)
  #   end
  # end

  # def put_user_token(conn, _) do
  #   if user_id = get_session(conn, :user_id) do
  #     token = Phoenix.Token.sign(conn, "user socket", user_id)
  #     put_session(conn, :user_token, token)
  #   else
  #     conn
  #   end
  # end
end
