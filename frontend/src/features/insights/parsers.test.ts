import { describe, expect, it } from "vitest";
import { parseMovement, parseOrderTiming } from "./parsers";

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

const SALE = {
  product: "spark_plug",
  type: "Sale",
  change: -1,
  posBefore: 5,
  posAfter: 4,
  unitCost: 350,
  unitPrice: 500,
  by: "uid1",
  at: ts("2026-11-10T04:00:00Z"),
};

describe("parseMovement", () => {
  it("reads a sale with its own cost and price", () => {
    expect(parseMovement("m1", SALE)).toEqual({
      id: "m1",
      product: "spark_plug",
      type: "Sale",
      change: -1,
      posBefore: 5,
      posAfter: 4,
      unitCost: 350,
      unitPrice: 500,
      reason: null,
      orderId: null,
      at: new Date("2026-11-10T04:00:00Z"),
      by: "uid1",
      seeded: false,
    });
  });

  it("keeps the reason, the order id and the demo marker", () => {
    const entry = parseMovement("m2", { ...SALE, type: "Adjustment", change: 1, reason: "CustomerReturn", seeded: true });
    expect(entry?.reason).toBe("CustomerReturn");
    expect(entry?.seeded).toBe(true);
    const delivery = parseMovement("m3", { ...SALE, type: "OrderReceived", change: 10, orderId: "o1" });
    expect(delivery?.orderId).toBe("o1");
  });

  it("treats a missing or negative cost or price as unknown", () => {
    const entry = parseMovement("m4", { ...SALE, unitCost: null, unitPrice: -1 });
    expect(entry?.unitCost).toBeNull();
    expect(entry?.unitPrice).toBeNull();
  });

  it("drops an unknown reason rather than the entry", () => {
    expect(parseMovement("m5", { ...SALE, reason: "Shrunk" })?.reason).toBeNull();
  });

  it("returns null for a malformed or still-pending entry", () => {
    expect(parseMovement("x", undefined)).toBeNull();
    expect(parseMovement("x", { ...SALE, type: "Gift" })).toBeNull();
    expect(parseMovement("x", { ...SALE, product: "" })).toBeNull();
    expect(parseMovement("x", { ...SALE, change: 1.5 })).toBeNull();
    expect(parseMovement("x", { ...SALE, posBefore: -1 })).toBeNull();
    expect(parseMovement("x", { ...SALE, at: null })).toBeNull();
  });
});

describe("parseOrderTiming", () => {
  const ORDER = { product: "spark_plug", qty: 10, state: "Received", createdAt: ts("2026-11-01T00:00:00Z"), receivedAt: ts("2026-11-04T00:00:00Z") };

  it("reads the timing fields", () => {
    expect(parseOrderTiming("o1", { ...ORDER, seeded: true })).toEqual({
      id: "o1",
      product: "spark_plug",
      qty: 10,
      state: "Received",
      createdAt: new Date("2026-11-01T00:00:00Z"),
      receivedAt: new Date("2026-11-04T00:00:00Z"),
      seeded: true,
    });
  });

  it("allows an order that is not received yet", () => {
    const pending = parseOrderTiming("o2", { product: "spark_plug", qty: 1, state: "Pending", createdAt: ts("2026-11-01T00:00:00Z") });
    expect(pending?.receivedAt).toBeNull();
    expect(pending?.seeded).toBe(false);
  });

  it("returns null when malformed", () => {
    expect(parseOrderTiming("x", undefined)).toBeNull();
    expect(parseOrderTiming("x", { ...ORDER, qty: 0 })).toBeNull();
    expect(parseOrderTiming("x", { ...ORDER, product: 3 })).toBeNull();
    expect(parseOrderTiming("x", { ...ORDER, state: "" })).toBeNull();
  });
});
