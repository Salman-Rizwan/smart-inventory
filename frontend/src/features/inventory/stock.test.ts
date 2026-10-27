import { describe, expect, it } from "vitest";
import { MAX_POS_COUNT, nextPosCount, StockError } from "./stock";

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
