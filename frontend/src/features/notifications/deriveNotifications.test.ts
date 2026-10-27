import { describe, expect, it } from "vitest";
import type { Alert } from "../alerts/types";
import type { Order, OrderState } from "../orders/types";
import { alertKey, deriveNotifications, orderKey, sortNotifications } from "./deriveNotifications";
import type { NotificationView } from "./types";

const alert = (id: string, state: Alert["state"], product = "spark_plug", visualCount = 3, posCount = 4): Alert => ({
  id,
  product,
  state,
  visualCount,
  posCount,
  createdAt: new Date("2026-10-27T05:00:00Z"),
});
const order = (id: string, state: OrderState, extra: Partial<Order> = {}): Order => ({
  id,
  product: "petrol_filter",
  qty: 10,
  state,
  createdAt: new Date("2026-10-27T01:00:00Z"),
  ...extra,
});

describe("deriveNotifications: shopkeeper", () => {
  it("lists open alerts, describing what the camera and POS say", () => {
    const [n] = deriveNotifications("shopkeeper", [alert("a1", "Open")], []);
    expect(n).toMatchObject({
      key: "alert:a1",
      title: "Spark Plug mismatch",
      detail: "Camera sees 3, POS says 4.",
      target: { kind: "alert", id: "a1" },
    });
  });

  it("leaves out acknowledged alerts: they are already handled", () => {
    expect(deriveNotifications("shopkeeper", [alert("a1", "Acknowledged")], [])).toEqual([]);
  });

  it("lists dispatched orders waiting to be confirmed, timed from when they were sent", () => {
    const sent = new Date("2026-10-27T03:00:00Z");
    const [n] = deriveNotifications("shopkeeper", [], [order("o1", "Dispatched", { dispatchedAt: sent })]);
    expect(n).toMatchObject({
      key: "order:o1:Dispatched",
      title: "Order #O1 is on the way",
      detail: "10 × Petrol Filter. Mark it received when it arrives.",
      time: sent,
      target: { kind: "order", id: "o1", state: "Dispatched" },
    });
  });

  it("falls back to the order's creation time when the dispatch time is missing", () => {
    const [n] = deriveNotifications("shopkeeper", [], [order("o1", "Dispatched")]);
    expect(n.time).toEqual(new Date("2026-10-27T01:00:00Z"));
  });

  it.each(["Pending", "Accepted", "Received"] as const)("ignores a %s order", (state) => {
    expect(deriveNotifications("shopkeeper", [], [order("o1", state)])).toEqual([]);
  });

  it("lists alerts and dispatched orders together", () => {
    const keys = deriveNotifications("shopkeeper", [alert("a1", "Open")], [order("o1", "Dispatched")]).map((n) => n.key);
    expect(keys).toEqual(["alert:a1", "order:o1:Dispatched"]);
  });
});

describe("deriveNotifications: dealer", () => {
  it("lists pending orders waiting for acceptance", () => {
    const [n] = deriveNotifications("dealer", [], [order("o1", "Pending")]);
    expect(n).toMatchObject({
      key: "order:o1:Pending",
      title: "Order #O1 needs acceptance",
      detail: "10 × Petrol Filter",
      target: { kind: "order", id: "o1", state: "Pending" },
    });
  });

  it.each(["Accepted", "Dispatched", "Received"] as const)("ignores a %s order", (state) => {
    expect(deriveNotifications("dealer", [], [order("o1", state)])).toEqual([]);
  });

  it("never shows alerts to the dealer", () => {
    expect(deriveNotifications("dealer", [alert("a1", "Open")], [])).toEqual([]);
  });
});

describe("keys", () => {
  it("are stable and include the order state, so a later state is a new notification", () => {
    expect(alertKey("a1")).toBe("alert:a1");
    expect(orderKey("o1", "Pending")).not.toBe(orderKey("o1", "Dispatched"));
  });
});

describe("sortNotifications", () => {
  const view = (key: string, unread: boolean, iso: string | null): NotificationView => ({
    key,
    unread,
    title: key,
    detail: "",
    time: iso ? new Date(iso) : null,
    target: { kind: "alert", id: key },
  });

  it("puts unread first, then newest first", () => {
    const sorted = sortNotifications([
      view("read-new", false, "2026-10-27T09:00:00Z"),
      view("unread-old", true, "2026-10-27T01:00:00Z"),
      view("unread-new", true, "2026-10-27T05:00:00Z"),
      view("read-old", false, "2026-10-27T02:00:00Z"),
    ]);
    expect(sorted.map((n) => n.key)).toEqual(["unread-new", "unread-old", "read-new", "read-old"]);
  });

  it("treats an item with no timestamp yet as the newest", () => {
    expect(sortNotifications([view("a", true, "2026-10-27T05:00:00Z"), view("pending", true, null)])[0].key).toBe("pending");
  });

  it("does not change the input", () => {
    const input = [view("b", false, null), view("a", true, null)];
    sortNotifications(input);
    expect(input.map((n) => n.key)).toEqual(["b", "a"]);
  });
});
