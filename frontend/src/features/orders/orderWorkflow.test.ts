import { describe, expect, it } from "vitest";
import { countByState, DEALER_ACTIONS, describePending, filterOrders, parseFilter, shortId, sortOrders } from "./orderWorkflow";
import type { Order, OrderState } from "./types";

const order = (id: string, state: OrderState, iso: string | null = "2026-10-27T05:00:00Z"): Order => ({
  id,
  product: "spark_plug",
  qty: 10,
  state,
  createdAt: iso ? new Date(iso) : null,
});

describe("DEALER_ACTIONS", () => {
  it("moves Pending to Accepted and Accepted to Dispatched, each with its own timestamp", () => {
    expect(DEALER_ACTIONS.Pending).toEqual({ label: "Accept Order", next: "Accepted", timestampField: "acceptedAt" });
    expect(DEALER_ACTIONS.Accepted).toEqual({ label: "Mark Dispatched", next: "Dispatched", timestampField: "dispatchedAt" });
  });

  it("gives the dealer nothing to do once an order is dispatched or received", () => {
    expect(DEALER_ACTIONS.Dispatched).toBeUndefined();
    expect(DEALER_ACTIONS.Received).toBeUndefined();
  });
});

describe("parseFilter", () => {
  it.each([
    ["completed", "completed"],
    ["all", "all"],
    ["open", "open"],
    [null, "open"],
    ["", "open"],
    ["pending", "open"],
    ["<script>", "open"],
  ] as const)("%j -> %s", (raw, expected) => expect(parseFilter(raw)).toBe(expected));
});

describe("countByState", () => {
  it("counts every state, including zeros", () => {
    const counts = countByState([order("a", "Pending"), order("b", "Pending"), order("c", "Received")]);
    expect(counts).toEqual({ Pending: 2, Accepted: 0, Dispatched: 0, Received: 1 });
    expect(countByState([])).toEqual({ Pending: 0, Accepted: 0, Dispatched: 0, Received: 0 });
  });
});

describe("filterOrders", () => {
  const all = [order("p", "Pending"), order("a", "Accepted"), order("d", "Dispatched"), order("r", "Received")];

  it("open is everything not yet received", () => {
    expect(filterOrders(all, "open").map((o) => o.id)).toEqual(["p", "a", "d"]);
  });

  it("completed is only received orders", () => {
    expect(filterOrders(all, "completed").map((o) => o.id)).toEqual(["r"]);
  });

  it("all keeps everything", () => {
    expect(filterOrders(all, "all")).toHaveLength(4);
  });
});

describe("sortOrders", () => {
  it("puts the action queue first: Pending, Accepted, Dispatched, then Received", () => {
    const sorted = sortOrders([
      order("received", "Received"),
      order("dispatched", "Dispatched"),
      order("pending", "Pending"),
      order("accepted", "Accepted"),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(["pending", "accepted", "dispatched", "received"]);
  });

  it("shows the oldest open order first, so nothing is forgotten", () => {
    const sorted = sortOrders([
      order("new", "Pending", "2026-10-27T09:00:00Z"),
      order("old", "Pending", "2026-10-27T01:00:00Z"),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(["old", "new"]);
  });

  it("shows the newest received order first", () => {
    const sorted = sortOrders([
      order("old", "Received", "2026-10-25T01:00:00Z"),
      order("new", "Received", "2026-10-27T01:00:00Z"),
    ]);
    expect(sorted.map((o) => o.id)).toEqual(["new", "old"]);
  });

  it("does not change the input", () => {
    const input = [order("b", "Received"), order("a", "Pending")];
    sortOrders(input);
    expect(input.map((o) => o.id)).toEqual(["b", "a"]);
  });
});

describe("labels", () => {
  it("shortens an id for display", () => {
    expect(shortId("abc123xyz789")).toBe("#ABC123");
  });

  it("describes the pending count", () => {
    expect(describePending(0)).toBe("No pending orders.");
    expect(describePending(1)).toBe("1 pending order.");
    expect(describePending(4)).toBe("4 pending orders.");
  });
});
