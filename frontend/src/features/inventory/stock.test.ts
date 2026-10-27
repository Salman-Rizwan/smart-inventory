import { describe, expect, it } from "vitest";
import { MAX_POS_COUNT, nextPosCount, receiptPosCount, StockError } from "./stock";

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof StockError ? error.code : "other";
  }
  return "none";
};

describe("nextPosCount", () => {
  it("applies a sale and a receipt", () => {
    expect(nextPosCount(3, -1)).toBe(2);
    expect(nextPosCount(3, 10)).toBe(13);
  });

  it("can take the POS count to exactly zero", () => {
    expect(nextPosCount(1, -1)).toBe(0);
  });

  it("refuses a sale when the POS record is already zero", () => {
    expect(codeOf(() => nextPosCount(0, -1))).toBe("insufficient");
  });

  it("refuses to exceed the maximum", () => {
    expect(codeOf(() => nextPosCount(MAX_POS_COUNT, 1))).toBe("too_large");
    expect(nextPosCount(MAX_POS_COUNT - 1, 1)).toBe(MAX_POS_COUNT);
  });

  it.each([0, 1.5, NaN, Infinity, 1000, -1000])("refuses an invalid change of %s", (delta) => {
    expect(codeOf(() => nextPosCount(5, delta))).toBe("invalid_quantity");
  });
});

describe("receiptPosCount", () => {
  it("adds the received quantity", () => {
    expect(receiptPosCount(1, 10)).toBe(11);
    expect(receiptPosCount(0, 1)).toBe(1);
  });

  it("is not limited to 999 per receipt like manual entry is", () => {
    expect(receiptPosCount(0, 5000)).toBe(5000);
  });

  it("refuses to exceed the maximum POS count", () => {
    expect(codeOf(() => receiptPosCount(MAX_POS_COUNT, 1))).toBe("too_large");
    expect(receiptPosCount(MAX_POS_COUNT - 10, 10)).toBe(MAX_POS_COUNT);
  });

  it.each([0, -3, 1.5, NaN])("refuses an invalid quantity of %s", (qty) => {
    expect(codeOf(() => receiptPosCount(5, qty))).toBe("invalid_quantity");
  });
});
