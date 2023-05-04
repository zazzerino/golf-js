defmodule GolfWeb.RoomChannel do
  use GolfWeb, :channel

  @impl true
  def join("room:lobby", _, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_game", payload, socket) do
    IO.inspect(payload, label: "PAYLOAD")
    {:noreply, socket}
  end

  # @impl true
  # def join("room:lobby", payload, socket) do
  #   if authorized?(payload) do
  #     {:ok, socket}
  #   else
  #     {:error, %{reason: "unauthorized"}}
  #   end
  # end

  # Add authorization logic here as required.
  # defp authorized?(payload) do
  #   true
  # end
end
