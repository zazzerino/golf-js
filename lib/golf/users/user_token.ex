defmodule Golf.Users.UserToken do
  use Golf.Schema

  @rand_size 32

  schema "users_tokens" do
    belongs_to :user, Golf.Users.User
    field :token, :binary

    timestamps(updated_at: false)
  end

  def build_token() do
    :crypto.strong_rand_bytes(@rand_size)
  end
end
