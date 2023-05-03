defmodule Golf.Users do
  import Ecto.Query, warn: false

  alias Golf.Repo
  alias Golf.Users.{User}

  def get_user(user_id) do
    Repo.get(User, user_id)
  end

  def create_user() do
    Repo.insert(%User{})
  end

  def update_username(user_id, username) do
    from(u in User, where: [id: ^user_id])
    |> Repo.update_all(set: [username: username])
  end

  # def insert_user_and_token() do
  #   Ecto.Multi.new()
  #   |> Ecto.Multi.insert(:user, %User{})
  #   |> Ecto.Multi.insert(:token, fn %{user: user} ->
  #     %UserToken{user_id: user.id, token: UserToken.build_token}
  #   end)
  #   |> Repo.transaction()
  # end

  # def get_user_by_token_query(token) do
  #   from(t in UserToken,
  #     where: [token: ^token],
  #     join: u in assoc(t, :user),
  #     select: u
  #   )
  # end

  # def get_user_by_token(token) do
  #   get_user_by_token_query(token)
  #   |> Repo.one()
  # end
end
