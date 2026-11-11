import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./OrdersContext", () => ({ useOrders: vi.fn() }));
vi.mock("./orderActions", () => ({ performOrderAction: vi.fn(), performCancel: vi.fn() }));

import { useOrders } from "./OrdersContext";
import { performCancel, performOrderAction } from "./orderActions";
import OrdersPage from "./OrdersPage";
import type { Order, OrderRole, OrderState } from "./types";

const order = (id: string, state: OrderState, product = "spark_plug", qty = 10, hour = 5): Order => ({
  id,
  product,
  qty,
  state,
  createdAt: new Date(`2026-10-27T0${hour}:00:00Z`),
});

const provide = (orders: Order[], extra: Partial<ReturnType<typeof useOrders>> = {}, role: OrderRole = "dealer") =>
  vi.mocked(useOrders).mockReturnValue({
    enabled: true,
    role,
    orders,
    pendingCount: orders.filter((o) => o.state === "Pending").length,
    attentionCount: orders.filter((o) => o.state === (role === "dealer" ? "Pending" : "Dispatched")).length,
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

    it("shows a different empty state on the Closed filter", () => {
      provide([order("a", "Pending")]);
      renderPage("/orders?status=closed");
      expect(screen.getByText("No closed orders yet")).toBeInTheDocument();
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
      expect(screen.getByRole("button", { name: "Closed 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All 4" })).toBeInTheDocument();
    });

    it("switches to closed orders", async () => {
      provide(ORDERS);
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: /Closed/ }));
      expect(screen.getByRole("button", { name: /Closed/ })).toHaveAttribute("aria-pressed", "true");
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
      const { unmount } = renderPage("/orders?status=completed"); // the old name still opens Closed
      expect(screen.getByRole("button", { name: /Closed/ })).toHaveAttribute("aria-pressed", "true");
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
      vi.mocked(performOrderAction).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ }));

      expect(performOrderAction).toHaveBeenCalledWith(
        "aaaaaa111",
        expect.objectContaining({ next: "Accepted", timestampField: "acceptedAt" }),
      );
    });

    it("dispatches an accepted order", async () => {
      provide(ORDERS);
      vi.mocked(performOrderAction).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Mark Dispatched: order #BBBBBB/ }));

      expect(performOrderAction).toHaveBeenCalledWith(
        "bbbbbb222",
        expect.objectContaining({ next: "Dispatched", timestampField: "dispatchedAt" }),
      );
    });

    it("shows a next step when the update is refused, without leaking details, and keeps the button", async () => {
      provide(ORDERS);
      vi.mocked(performOrderAction).mockRejectedValue({ code: "permission-denied", message: "secret rule detail" });
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/Refresh the page/);
      expect(alert).not.toHaveTextContent("secret");
      expect(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ })).toBeEnabled();
    });
  });

  describe("outcome message", () => {
    it("confirms what happened after an action", async () => {
      provide(ORDERS);
      vi.mocked(performOrderAction).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Accept Order: order #AAAAAA/ }));

      expect(await screen.findByText(/Order #AAAAAA accepted/)).toBeInTheDocument();
    });
  });

  describe("as a shopkeeper", () => {
    it("uses the shop's wording", () => {
      provide(ORDERS, {}, "shopkeeper");
      renderPage();
      expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument();
      expect(screen.getByText(/Mark an order received when it arrives, or cancel one the dealer has not sent/)).toBeInTheDocument();
      expect(screen.getByText("On the way: confirm when it arrives")).toBeInTheDocument();
    });

    it("lists the order waiting for confirmation first", () => {
      provide(ORDERS, {}, "shopkeeper");
      renderPage();
      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("#CCCCCC");
    });

    it("offers Mark Received on a dispatched order and Cancel Order only before dispatch", () => {
      provide(ORDERS, {}, "shopkeeper");
      renderPage();
      const buttons = (id: string) => within(screen.getByRole("row", { name: new RegExp(id) })).queryAllByRole("button").map((b) => b.textContent);
      expect(buttons("#CCCCCC")).toEqual(["Mark Received"]);
      expect(buttons("#AAAAAA")).toEqual(["Cancel Order"]);
      expect(buttons("#BBBBBB")).toEqual(["Cancel Order"]);
    });

    it("never offers the dealer Cancel Order", () => {
      provide(ORDERS);
      renderPage();
      expect(screen.queryByRole("button", { name: /^Cancel order/ })).not.toBeInTheDocument();
    });

    it("cancels with a reason, after confirming, and says what happens next", async () => {
      provide(ORDERS, {}, "shopkeeper");
      vi.mocked(performCancel).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Cancel order #AAAAAA, 10 Spark Plug" }));
      const dialog = await screen.findByRole("dialog", { name: "Cancel Order #AAAAAA?" });
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel Order" }));
      expect(await within(dialog).findByText("Choose why you are cancelling this order.")).toBeInTheDocument();
      expect(performCancel).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole("radio", { name: "Ordered by mistake" }));
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel Order" }));

      expect(performCancel).toHaveBeenCalledWith("aaaaaa111", "OrderedByMistake");
      expect(await screen.findByText(/^Order #AAAAAA cancelled\. .*If Spark Plug stays low on the shelf/)).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Keep Order closes the dialog and changes nothing", async () => {
      provide(ORDERS, {}, "shopkeeper");
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: /Cancel order #BBBBBB/ }));
      await userEvent.click(await screen.findByRole("button", { name: "Keep Order" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(performCancel).not.toHaveBeenCalled();
    });

    it("explains a cancel that came too late: the dealer dispatched it first", async () => {
      provide(ORDERS, {}, "shopkeeper");
      const { OrderError } = await import("./orderWorkflow");
      vi.mocked(performCancel).mockRejectedValue(new OrderError("moved_on", "Dispatched"));
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: /Cancel order #BBBBBB/ }));
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(within(dialog).getByRole("radio", { name: "Not needed any more" }));
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel Order" }));
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Order #BBBBBB has already been dispatched, so it can no longer be cancelled. Mark it received when it arrives.",
      );
    });

    it("shows a cancelled order as closed, with its reason and the name stored on it", () => {
      const cancelled: Order = { ...order("ffffff666", "Cancelled", "petrol_filter"), productName: "Bosch Petrol Filter", cancelReason: "NotNeeded" };
      provide([...ORDERS, cancelled], {}, "shopkeeper");
      renderPage("/orders?status=closed");
      const row = within(screen.getByRole("row", { name: /#FFFFFF/ }));
      expect(row.getByText("Bosch Petrol Filter")).toBeInTheDocument();
      expect(row.getByText("Cancelled")).toBeInTheDocument();
      expect(row.getByText("Not needed any more")).toBeInTheDocument();
      expect(row.queryByRole("button")).not.toBeInTheDocument();
      const tile = screen.getByText("Cancelled", { selector: "dt" }).closest("div") as HTMLElement;
      expect(within(tile).getByText("1")).toBeInTheDocument();
    });

    it("marks an order received and says the POS record was updated", async () => {
      provide(ORDERS, {}, "shopkeeper");
      vi.mocked(performOrderAction).mockResolvedValue(undefined);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Mark Received: order #CCCCCC/ }));

      expect(performOrderAction).toHaveBeenCalledWith(
        "cccccc333",
        expect.objectContaining({ next: "Received", timestampField: "receivedAt" }),
      );
      expect(await screen.findByText("Order #CCCCCC received. 10 × Spark Plug added to the POS record.")).toBeInTheDocument();
    });

    it("explains a refusal, such as receiving twice, and keeps the button", async () => {
      provide(ORDERS, {}, "shopkeeper");
      const { OrderError } = await import("./orderWorkflow");
      vi.mocked(performOrderAction).mockRejectedValue(new OrderError("moved_on", "Received"));
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: /Mark Received: order #CCCCCC/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/already been received.*added to the POS record once/);
      expect(screen.getByRole("button", { name: /Mark Received: order #CCCCCC/ })).toBeEnabled();
    });

    it("announces the number of orders waiting to be received", () => {
      provide(ORDERS, {}, "shopkeeper");
      renderPage();
      expect(screen.getAllByRole("status").some((el) => el.textContent === "1 order waiting to be received.")).toBe(true);
    });
  });
});
