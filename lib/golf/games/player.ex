defmodule Golf.Games.Player do
  use Golf.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [:id, :user_id, :hand, :held_card, :turn, :host?, :username, :score]}
  schema "players" do
    belongs_to :game, Golf.Games.Game
    belongs_to :user, Golf.Users.User

    field :hand, {:array, :map}, default: []
    field :held_card, :string
    field :turn, :integer
    field :host?, :boolean, default: false

    field :username, :string, virtual: true
    field :score, :integer, virtual: true

    has_many :events, Golf.Games.Event

    timestamps()
  end

  @doc false
  def changeset(player, attrs) do
    player
    |> cast(attrs, [:user_id, :game_id, :hand, :held_card, :turn, :host?])
    |> validate_required([:user_id, :game_id, :hand, :turn, :host?])
  end
end
