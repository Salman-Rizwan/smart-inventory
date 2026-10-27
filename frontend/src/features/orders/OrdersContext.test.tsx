import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./orderRepository", () => ({ subscribeOrders: vi.fn() }));

import { OrdersProvider, useOrders } from "./OrdersContext";
import { subscribeOrders } from "./orderRepository";
import type { Order, OrderState } from "./types";

const order = (id: string, state: OrderState): Order => ({ id, product: "spark_plug", qty: 10, state, createdAt: null });

function Probe() {
  const { pendingCount, orders, loading, error } = useOrders();
  return <p>{`pending=${pendingCount} total=${orders.length} loading=${loading} error=${error}`}</p>;
}

const mount = (enabled = true) =>
  render(
    <OrdersProvider enabled={enabled}>
      <Probe />
    </OrdersProvider>,
  );

describe("OrdersProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "Smart Inventory";
  });

  it("counts pending orders and shows the count in the browser tab title", () => {
    vi.mocked(subscribeOrders).mockImplementation((onData) => {
      onData([order("a", "Pending"), order("b", "Pending"), order("c", "Accepted"), order("d", "Received")]);
      return () => {};
    });
    mount();
    expect(screen.getByText("pending=2 total=4 loading=false error=")).toBeInTheDocument();
    expect(document.title).toBe("(2) Smart Inventory");
  });

  it("uses the plain title when nothing is pending", () => {
    vi.mocked(subscribeOrders).mockImplementation((onData) => {
      onData([order("c", "Accepted")]);
      return () => {};
    });
    mount();
    expect(document.title).toBe("Smart Inventory");
  });

  it("restores the title and unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribeOrders).mockImplementation((onData) => {
      onData([order("a", "Pending")]);
      return unsubscribe;
    });
    const { unmount } = mount();
    expect(document.title).toBe("(1) Smart Inventory");
    unmount();
    expect(document.title).toBe("Smart Inventory");
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
    expect(screen.getByText("pending=0 total=0 loading=false error=")).toBeInTheDocument();
    expect(document.title).toBe("Smart Inventory");
  });
});
