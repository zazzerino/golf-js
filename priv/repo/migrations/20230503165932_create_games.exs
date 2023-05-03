defmodule Golf.Repo.Migrations.CreateGames do
  use Ecto.Migration

  def change do
    create table(:games) do
      add :status, :string
      add :turn, :integer
      add :deck, {:array, :string}
      add :table_cards, {:array, :string}
      add :deleted?, :boolean

      timestamps()
    end

    create table(:players) do
      add :game_id, references(:games)
      add :user_id, references(:users)

      add :hand, {:array, :map}
      add :held_card, :string
      add :turn, :integer
      add :host?, :boolean

      timestamps()
    end

    create table(:events) do
      add :game_id, references(:games)
      add :player_id, references(:players)

      add :action, :string
      add :hand_index, :integer

      timestamps(updated_at: false)
    end

    create table(:join_requests) do
      add :game_id, references(:games)
      add :user_id, references(:users)
      add :confirmed?, :boolean

      timestamps()
    end

    create table(:game_chat_messages) do
      add :game_id, references(:games)
      add :user_id, references(:users)
      add :content, :string

      timestamps()
    end
  end
end
