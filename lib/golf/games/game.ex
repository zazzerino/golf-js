defmodule Golf.Games.Game do
  use Golf.Schema
  import Ecto.Changeset

  @statuses [:init, :flip2, :take, :hold, :flip, :last_take, :last_hold, :over]

  @derive {Jason.Encoder, only: [:status, :turn, :deck, :table_cards, :players]}
  schema "games" do
    field :status, Ecto.Enum, values: @statuses, default: :init
    field :turn, :integer, default: 0
    field :deck, {:array, :string}
    field :table_cards, {:array, :string}, default: []
    field :deleted?, :boolean, default: false

    has_many :players, Golf.Games.Player
    has_many :events, Golf.Games.Event
    has_many :join_requests, Golf.Games.JoinRequest
    has_many :chat_messages, Golf.Games.ChatMessage

    timestamps()
  end

  @doc false
  def changeset(game, attrs) do
    game
    |> cast(attrs, [:status, :turn, :deck, :table_cards, :deleted?])
    |> validate_required([:status, :turn, :deck, :table_cards, :deleted?])
  end
end
