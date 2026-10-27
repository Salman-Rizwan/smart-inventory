import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./OrdersContext", () => ({ useOrders: vi.fn() }));
vi.mock("./orderRepository", () => ({ advanceOrder: vi.fn() }));

import { useOrders } from "./OrdersContext";
import { advanceOrder } from "./orderRepository";
import OrdersPage from "./OrdersPage";
import type { Order, OrderState } from "./types";

const order = (id: string, state: OrderState, product = "spark_plug", qty = 10, hour = 5): Order => ({
  id,
  product,
  qty,
  state,
  createdAt: new Date(`2026-10-27T0${hour}:00:00Z`),
});

const provide = (orders: Order[], extra: Partial<ReturnType<typeof useOrders>> = {}) =>
  vi.mocked(useOrders).mockReturnValue({
    enabled: true,
    orders,
    pendingCount: orders.filter((o) => o.state === "Pending").length,
    loading: false,
    error: "",
    ...extra,
  });

const renderPage = (path = "/orders") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OrdersPage />
    </MemoryRouter>,
  );

const ORDERS = [
  order("aaaaaa111", "Pending", "spark_plug", 10, 5),
  order("bbbbbb222", "Accepted", "petrol_filter", 6, 4),
  order("cccccc333", "Dispatched", "spark_plug", 10, 3),
  order("dddddd444", "Received", "petrol_filter", 6, 2),
];

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("states", () => {
    it("shows loading and no tiles", () => {
      provide([], { loading: true });
      renderPage();
      expect(screen.getByText("Loading orders…")).toBeInTheDocument();
      expect(screen.queryByText("Needs your action")).not.toBeInTheDocument();
    });

    it("shows a load error", () => {
      provide([], { error: "Orders could not be loaded." });
      renderPage();
      expect(screen.getByRole("alert")).toHaveTextContent("Orders could not be loaded.");
    });

    it("shows an empty state for no open orders", () => {
      provide([]);
      renderPage();
      expect(screen.getByText("No open orders")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("shows a different empty state on the Completed filter", () => {
      provide([order("a", "Pending")]);
      renderPage("/orders?status=completed");
      expect(screen.getByText("No completed orders yet")).toBeInTheDocument();
    });
  });

  describe("summary and list", () => {
    it("shows a tile per state with its count", () => {
      provide([...ORDERS, order("eeeeee555", "Pending")]);
      renderPage();
      const pending = screen.getByText("Pending", { selector: "dt" }).closest("div") as HTMLElement;
      expect(within(pending).getByText("2")).toBeInTheDocument();
      expect(within(pending).getByText("Needs your action")).toBeInTheDocument();
    });

    it("lists open orders by default, those needing action first", () => {
      provide(ORDERS);
      renderPage();
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent("#AAAAAA");
      expect(rows[1]).toHaveTextContent("#BBBBBB");
      expect(rows[2]).toHaveTextContent("#CCCCCC");
      expect(screen.queryByText("#DDDDDD")).not.toBeInTheDocument();
    });

    it("shows the part name, quantity and status badge", () => {
      provide(ORDERS);
      renderPage();
      const row = within(screen.getByRole("row", { name: /#BBBBBB/ }));
      expect(row.getByText("Petrol Filter")).toBeInTheDocument();
      expect(row.getByText("6")).toBeInTheDocument();
      expect(row.getByText("Accepted")).toBeInTheDocument();
    });

    it("announces the pending count to screen readers", () => {
      provide(ORDERS);
      renderPage();
      expect(screen.getAllByRole("status").some((el) => el.textContent === "1 pending order.")).toBe(true);
    });
  });

  describe("filters", () => {
    it("shows the count on each filter, with a space so it reads \"Open 3\" and not \"Open3\"", () => {
      provide(ORDERS);
      renderPage();
      expect(screen.getByRole("button", { name: "Open 3" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Completed 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All 4" })).toBeInTheDocument();
    });

    it("switches to completed orders", async () => {
      provide(ORDERS);
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: /Completed/ }));
      expect(screen.getByRole("button", { name: /Completed/ })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByRole("row").slice(1)).toHaveLength(1);
      expect(screen.getByText("#DDDDDD")).toBeInTheDocument();
    });

    it("shows everything on All", async () => {
      provide(ORDERS);
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: /All/ }));
      expect(screen.getAllByRole("row").slice(1)).toHaveLength(4);
    });

    it("reads the filter from the URL, and ignores nonsense", () => {
      provide(ORDERS);
      const { unmount } = renderPage("/orders?status=completed");
      expect(screen.getByRole("button", { name: /Completed/ })).toHaveAttribute("aria-pressed", "true");
      unmount();
      renderPage("/orders?status=%3Cscript%3E");
      expect(screen.getByRole("button", { name: /Open/ })).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("actions", () => {
    it("offers Accept Order on a pending order and Mark Dispatched on an accepted one", () => {
      provide(ORDERS);
      renderPage();
      expect(within(screen.getByRole("row", { name: /#AAAAAA/ })).getByRole("button", { name: /Accept Order/ })).toBeInTheDocument();
      expect(within(screen.getByRole("row", { name: /#BBBBBB/ })).getByRole("button", { name: /Mark Dispatched/ })).toBeInTheDocument();
    });

    it("offers the dealer nothing on a dispatched order", () => {
      provide(ORDERS);
      renderPage();
      expect(within(screen.getByRole("row", { name: /#CCCCCC/ })).queryByRole("button")).not.toBeInTheDocument();
    });

    it("accepts an order with the right next step", async () => {
      provide(ORDERS);
      vi.mocked(advanceOrder).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ }));

      expect(advanceOrder).toHaveBeenCalledWith(
        "aaaaaa111",
        expect.objectContaining({ next: "Accepted", timestampField: "acceptedAt" }),
      );
    });

    it("dispatches an accepted order", async () => {
      provide(ORDERS);
      vi.mocked(advanceOrder).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Mark Dispatched: order #BBBBBB/ }));

      expect(advanceOrder).toHaveBeenCalledWith(
        "bbbbbb222",
        expect.objectContaining({ next: "Dispatched", timestampField: "dispatchedAt" }),
      );
    });

    it("shows a next step when the update is refused, without leaking details, and keeps the button", async () => {
      provide(ORDERS);
      vi.mocked(advanceOrder).mockRejectedValue({ code: "permission-denied", message: "secret rule detail" });
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Refresh the page/);
      expect(alert).not.toHaveTextContent("secret");
      expect(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ })).toBeEnabled();
    });
  });
});
