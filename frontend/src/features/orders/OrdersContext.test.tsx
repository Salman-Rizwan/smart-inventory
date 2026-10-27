import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./orderRepository", () => ({ subscribeOrders: vi.fn() }));

import { OrdersProvider, useOrders } from "./OrdersContext";
import { subscribeOrders } from "./orderRepository";
import type { Order, OrderState } from "./types";

const order = (id: string, state: OrderState): Order => ({ id, product: "spark_plug", qty: 10, state, createdAt: null });

function Probe() {
  const { pendingCount, attentionCount, orders, loading, error } = useOrders();
  return <p>{`pending=${pendingCount} attention=${attentionCount} total=${orders.length} loading=${loading} error=${error}`}</p>;
}

const mount = (enabled = true, role: "dealer" | "shopkeeper" = "dealer") =>
  render(
    <OrdersProvider enabled={enabled} role={role}>
      <Probe />
    </OrdersProvider>,
  );

describe("OrdersProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts pending orders", () => {
    vi.mocked(subscribeOrders).mockImplementation((onData) => {
      onData([order("a", "Pending"), order("b", "Pending"), order("c", "Accepted"), order("d", "Received")]);
      return () => {};
    });
    mount();
    expect(screen.getByText("pending=2 attention=2 total=4 loading=false error=")).toBeInTheDocument();
  });

  it("counts dispatched orders as the shopkeeper's attention", () => {
    vi.mocked(subscribeOrders).mockImplementation((onData) => {
      onData([order("a", "Pending"), order("b", "Dispatched"), order("c", "Dispatched")]);
      return () => {};
    });
    mount(true, "shopkeeper");
    expect(screen.getByText("pending=1 attention=2 total=3 loading=false error=")).toBeInTheDocument();
  });

  it("unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribeOrders).mockImplementation((onData) => {
      onData([order("a", "Pending")]);
      return unsubscribe;
    });
    mount().unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("surfaces a listener failure as a message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(subscribeOrders).mockImplementation((_onData, onError) => {
      onError(new Error("permission-denied"));
      return () => {};
    });
    mount();
    expect(screen.getByText(/error=Orders could not be loaded/)).toBeInTheDocument();
  });

  it("never subscribes for a role that does not see orders", () => {
    mount(false);
    expect(subscribeOrders).not.toHaveBeenCalled();
    expect(screen.getByText("pending=0 attention=0 total=0 loading=false error=")).toBeInTheDocument();
  });
});
