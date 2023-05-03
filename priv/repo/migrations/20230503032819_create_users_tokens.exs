defmodule Golf.Repo.Migrations.CreateUserTokens do
  use Ecto.Migration

  def change do
    create table(:users_tokens) do
      add :user_id, references(:users, on_delete: :delete_all)
      add :token, :binary

      timestamps(updated_at: false)
    end

    create index(:users_tokens, [:user_id])
  end
end
