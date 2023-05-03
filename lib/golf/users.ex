defmodule Golf.Users do
  import Ecto.Query, warn: false

  alias Golf.Repo
  alias Golf.Users.{User, UserToken}

  def get_user(user_id) do
    Repo.get(User, user_id)
  end

  def get_user_by_token(token) do
    from(t in UserToken,
      where: [token: ^token],
      join: u in assoc(t, :user),
      select: u
    )
    |> Repo.one()
  end

  def create_user() do
    Repo.insert(%User{})
  end

  def create_user_token(user_id, token) do
    %UserToken{user_id: user_id, token: token}
    |> Repo.insert()
  end

  def update_username(user_id, username) do
    from(u in User, where: [id: ^user_id])
    |> Repo.update_all(set: [username: username])
  end
end
