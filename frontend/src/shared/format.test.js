import { describe, expect, it } from "vitest";
import { CURRENCY, formatMoney } from "./format";

describe("formatMoney", () => {
  it("uses the shop's currency, LKR unless VITE_CURRENCY says otherwise", () => {
    expect(CURRENCY).toBe("LKR");
    expect(formatMoney(1250)).toMatch(/LKR\s?1,250\.00/);
    expect(formatMoney(0.5)).toMatch(/LKR\s?0\.50/);
  });

  it("shows a dash for a missing amount", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(NaN)).toBe("—");
  });
});
