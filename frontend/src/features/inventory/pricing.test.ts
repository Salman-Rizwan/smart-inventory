import { describe, expect, it } from "vitest";
import { marginPercent } from "./pricing";

describe("marginPercent", () => {
  it("is the share of the selling price kept after cost, rounded", () => {
    expect(marginPercent({ unitCost: 950, unitPrice: 1250 })).toBe(24);
    expect(marginPercent({ unitCost: 1250, unitPrice: 1250 })).toBe(0);
  });

  it("is negative when selling below cost", () => {
    expect(marginPercent({ unitCost: 1500, unitPrice: 1000 })).toBe(-50);
  });

  it("is unknown until both are set, or when the price is 0", () => {
    expect(marginPercent({ unitCost: null, unitPrice: 1250 })).toBeNull();
    expect(marginPercent({ unitCost: 950, unitPrice: null })).toBeNull();
    expect(marginPercent({ unitCost: 0, unitPrice: 0 })).toBeNull();
  });
});
