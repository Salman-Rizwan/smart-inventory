import { describe, expect, it } from "vitest";
import { describeChange, planMovement, reasonsFor } from "./movements";
import { StockError } from "./stock";
import type { Product } from "./types";

const product = (over: Partial<Product> = {}): Product => ({
  id: "spark_plug",
  name: "Spark Plug",
  posCount: 4,
  reorderLevel: 3,
  reorderQty: 1,
  unitCost: 950,
  unitPrice: 1250,
  ...over,
});

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof StockError ? error.code : "other";
  }
  return "none";
};

describe("planMovement", () => {
  it("logs a sale as one unit out, with the price and cost at that moment", () => {
    expect(planMovement(product(), { type: "Sale" }, "u1")).toEqual({
      product: "spark_plug",
      type: "Sale",
      change: -1,
      posBefore: 4,
      posAfter: 3,
      unitCost: 950,
      unitPrice: 1250,
      by: "u1",
    });
  });

  it("logs a receipt as units in", () => {
    expect(planMovement(product(), { type: "Receipt", qty: 10 }, "u1")).toMatchObject({ type: "Receipt", change: 10, posAfter: 14 });
  });

  it("logs an adjustment to the counted number, with its reason", () => {
    expect(planMovement(product(), { type: "Adjustment", target: 2, reason: "LostOrStolen" }, "u1")).toMatchObject({
      type: "Adjustment",
      change: -2,
      posBefore: 4,
      posAfter: 2,
      reason: "LostOrStolen",
    });
    expect(planMovement(product(), { type: "Adjustment", target: 5, reason: "CustomerReturn" }, "u1")).toMatchObject({ change: 1 });
  });

  it("logs an order receipt with the order id", () => {
    expect(planMovement(product(), { type: "OrderReceived", orderId: "o1", qty: 10 }, "u1")).toMatchObject({
      type: "OrderReceived",
      change: 10,
      posAfter: 14,
      orderId: "o1",
    });
  });

  it("adds a reason only to adjustments and an order id only to order receipts (the rules refuse extra fields)", () => {
    expect(planMovement(product(), { type: "Sale" }, "u1")).not.toHaveProperty("reason");
    expect(planMovement(product(), { type: "Sale" }, "u1")).not.toHaveProperty("orderId");
    expect(planMovement(product(), { type: "Adjustment", target: 3, reason: "Damaged" }, "u1")).not.toHaveProperty("orderId");
  });

  it("copies a missing cost or price as null, which is what the rules compare against", () => {
    expect(planMovement(product({ unitCost: null, unitPrice: null }), { type: "Sale" }, "u1")).toMatchObject({
      unitCost: null,
      unitPrice: null,
    });
  });

  it.each([
    ["a sale from 0", product({ posCount: 0 }), { type: "Sale" } as const, "insufficient"],
    ["a receipt of 0", product(), { type: "Receipt", qty: 0 } as const, "invalid_quantity"],
    ["a receipt over 999", product(), { type: "Receipt", qty: 1000 } as const, "invalid_quantity"],
    ["an adjustment to the same count", product(), { type: "Adjustment", target: 4, reason: "Miscount" } as const, "no_change"],
    ["an adjustment below 0", product(), { type: "Adjustment", target: -1, reason: "Damaged" } as const, "invalid_quantity"],
    ["a fractional adjustment", product(), { type: "Adjustment", target: 2.5, reason: "Damaged" } as const, "invalid_quantity"],
    ["an adjustment over the limit", product(), { type: "Adjustment", target: 100_001, reason: "Found" } as const, "too_large"],
    ["fewer units marked Found", product(), { type: "Adjustment", target: 3, reason: "Found" } as const, "invalid_reason"],
    ["more units marked Damaged", product(), { type: "Adjustment", target: 5, reason: "Damaged" } as const, "invalid_reason"],
    ["an order of 0", product(), { type: "OrderReceived", orderId: "o1", qty: 0 } as const, "invalid_quantity"],
  ])("refuses %s", (_name, p, input, code) => {
    expect(codeOf(() => planMovement(p, input, "u1"))).toBe(code);
  });
});

describe("reasonsFor", () => {
  it("offers write-offs for fewer units, finds and returns for more, and nothing for no change", () => {
    expect(reasonsFor(-2)).toEqual(["Damaged", "LostOrStolen", "Miscount"]);
    expect(reasonsFor(1)).toEqual(["Found", "CustomerReturn", "Miscount"]);
    expect(reasonsFor(0)).toEqual([]);
  });
});

describe("describeChange", () => {
  it("states the before and after counts and the signed change", () => {
    expect(describeChange(4, 3)).toMatch(/^POS record 4 → 3 \(.1\)$/);
    expect(describeChange(4, 6)).toBe("POS record 4 → 6 (+2)");
  });
});
