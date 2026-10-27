import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./OrdersContext", () => ({ useOrders: vi.fn() }));

import OrderBell from "./OrderBell";
import { useOrders } from "./OrdersContext";
import type { Order, OrderState } from "./types";

const order = (id: string, state: OrderState, product = "spark_plug", qty = 10, hour = 5): Order => ({
  id,
  product,
  qty,
  state,
  createdAt: new Date(`2026-10-27T0${hour}:00:00Z`),
});

const provide = (orders: Order[]) =>
  vi.mocked(useOrders).mockReturnValue({
    enabled: true,
    role: "dealer",
    orders,
    pendingCount: orders.filter((o) => o.state === "Pending").length,
    attentionCount: orders.filter((o) => o.state === "Pending").length,
    loading: false,
    error: "",
  });

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderBell = (path = "/somewhere") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OrderBell />
      <Where />
      <Routes>
        <Route path="/orders" element={<h1 id="orders-title" tabIndex={-1}>Purchase Orders</h1>} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );

describe("OrderBell", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("says nothing is pending and shows no badge", () => {
    provide([order("a", "Accepted")]);
    renderBell();
    expect(screen.getByRole("button", { name: "Notifications: no pending orders" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("counts pending orders, singular and plural", () => {
    provide([order("a", "Pending")]);
    const { unmount } = renderBell();
    expect(screen.getByRole("button", { name: "Notifications: 1 pending order" })).toBeInTheDocument();
    unmount();
    provide([order("a", "Pending"), order("b", "Pending")]);
    renderBell();
    expect(screen.getByRole("button", { name: "Notifications: 2 pending orders" })).toBeInTheDocument();
  });

  it("lists only pending orders, oldest first, with the quantity and part", async () => {
    provide([
      order("newer1", "Pending", "spark_plug", 10, 6),
      order("older2", "Pending", "petrol_filter", 6, 3),
      order("done33", "Received"),
    ]);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Order #OLDER2 needs acceptance");
    expect(items[0]).toHaveTextContent("6 × Petrol Filter");
    expect(items[1]).toHaveTextContent("Order #NEWER1");
  });

  it("shows an empty state when nothing is pending", async () => {
    provide([]);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("No pending orders")).toBeInTheDocument();
  });

  it("selecting an order opens the orders page, closes the menu and focuses the page heading", async () => {
    provide([order("abc123", "Pending")]);
    renderBell("/somewhere");
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await userEvent.click(screen.getByRole("button", { name: /Order #ABC123/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/orders");
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Purchase Orders" })).toHaveFocus());
  });
});
