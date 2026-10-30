import { describe, expect, it } from "vitest";
import {
  actionFor,
  attentionState,
  countByState,
  describeAttention,
  describeOutcome,
  filterOrders,
  explainRefusal,
  OrderError,
  parseFilter,
  shortId,
  sortOrders,
} from "./orderWorkflow";
import type { Order, OrderState } from "./types";

const order = (id: string, state: OrderState, iso: string | null = "2026-10-27T05:00:00Z"): Order => ({
  id,
  product: "spark_plug",
  qty: 10,
  state,
  createdAt: iso ? new Date(iso) : null,
});

describe("actionFor", () => {
  it("lets the dealer accept, then dispatch, each with its own timestamp", () => {
    expect(actionFor("dealer", "Pending")).toEqual({ label: "Accept Order", next: "Accepted", timestampField: "acceptedAt" });
    expect(actionFor("dealer", "Accepted")).toEqual({ label: "Mark Dispatched", next: "Dispatched", timestampField: "dispatchedAt" });
  });

  it("gives the dealer nothing once an order is dispatched or received", () => {
    expect(actionFor("dealer", "Dispatched")).toBeUndefined();
    expect(actionFor("dealer", "Received")).toBeUndefined();
  });

  it("lets the shopkeeper confirm only a dispatched order", () => {
    expect(actionFor("shopkeeper", "Dispatched")).toEqual({ label: "Mark Received", next: "Received", timestampField: "receivedAt" });
    for (const state of ["Pending", "Accepted", "Received"] as const) {
      expect(actionFor("shopkeeper", state)).toBeUndefined();
    }
  });
});

describe("attentionState", () => {
  it("is where an order waits for that role", () => {
    expect(attentionState("dealer")).toBe("Pending");
    expect(attentionState("shopkeeper")).toBe("Dispatched");
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
  const mixed = () => [
    order("received", "Received"),
    order("dispatched", "Dispatched"),
    order("pending", "Pending"),
    order("accepted", "Accepted"),
  ];

  it("puts the dealer's action queue first: Pending, Accepted, Dispatched, then Received", () => {
    expect(sortOrders(mixed(), "dealer").map((o) => o.id)).toEqual(["pending", "accepted", "dispatched", "received"]);
  });

  it("puts what the shopkeeper must confirm first: Dispatched, then the rest in order, Received last", () => {
    expect(sortOrders(mixed(), "shopkeeper").map((o) => o.id)).toEqual(["dispatched", "pending", "accepted", "received"]);
  });

  it("defaults to the dealer's order", () => {
    expect(sortOrders(mixed())[0].id).toBe("pending");
  });

  it("shows the oldest open order first, so nothing is forgotten", () => {
    const sorted = sortOrders([order("new", "Pending", "2026-10-27T09:00:00Z"), order("old", "Pending", "2026-10-27T01:00:00Z")]);
    expect(sorted.map((o) => o.id)).toEqual(["old", "new"]);
  });

  it("shows the newest received order first", () => {
    const sorted = sortOrders([order("old", "Received", "2026-10-25T01:00:00Z"), order("new", "Received", "2026-10-27T01:00:00Z")]);
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

  it("describes what is waiting for each role", () => {
    expect(describeAttention("dealer", 0)).toBe("No pending orders.");
    expect(describeAttention("dealer", 1)).toBe("1 pending order.");
    expect(describeAttention("dealer", 4)).toBe("4 pending orders.");
    expect(describeAttention("shopkeeper", 0)).toBe("No orders waiting to be received.");
    expect(describeAttention("shopkeeper", 2)).toBe("2 orders waiting to be received.");
  });

  it("says what happened after each action, and that receiving updated the POS", () => {
    const accept = actionFor("dealer", "Pending")!;
    const dispatch = actionFor("dealer", "Accepted")!;
    const receive = actionFor("shopkeeper", "Dispatched")!;
    expect(describeOutcome(accept, "#A1", 10, "Spark Plug")).toMatch(/accepted/);
    expect(describeOutcome(dispatch, "#A1", 10, "Spark Plug")).toMatch(/on the way/);
    expect(describeOutcome(receive, "#A1", 10, "Spark Plug")).toBe("Order #A1 received. 10 × Spark Plug added to the POS record.");
  });
});

describe("OrderError", () => {
  it("carries its code, and the current state when the order moved on", () => {
    const error = new OrderError("moved_on", "Received");
    expect(error.code).toBe("moved_on");
    expect(error.state).toBe("Received");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("explainRefusal", () => {
  const at = (state: OrderState): Order => ({ id: "a1", product: "spark_plug", qty: 2, state, createdAt: null });
  const accept = actionFor("dealer", "Pending")!;
  const receive = actionFor("shopkeeper", "Dispatched")!;

  it("says the order moved on when it is already at the requested step", () => {
    expect(explainRefusal(receive, at("Received"))).toMatchObject({ code: "moved_on", state: "Received" });
    expect(explainRefusal(accept, at("Accepted"))).toMatchObject({ code: "moved_on", state: "Accepted" });
  });

  it("says the order moved on when it is past the requested step", () => {
    expect(explainRefusal(accept, at("Dispatched"))).toMatchObject({ code: "moved_on", state: "Dispatched" });
  });

  it("says the order is gone when it no longer exists", () => {
    expect(explainRefusal(receive, null)).toMatchObject({ code: "not_found" });
  });

  it("has no explanation when the order has not moved, so the refusal was about permission", () => {
    expect(explainRefusal(accept, at("Pending"))).toBeNull();
    expect(explainRefusal(receive, at("Dispatched"))).toBeNull();
  });
});
