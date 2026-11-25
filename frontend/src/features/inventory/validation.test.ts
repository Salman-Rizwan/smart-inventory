import { describe, expect, it } from "vitest";
import { countChange, parseAdjustment, parsePartSettings, parseReceiveQty, settingsWarning } from "./validation";

describe("parseReceiveQty", () => {
  it.each([
    ["1", 1],
    ["10", 10],
    [" 25 ", 25],
    ["999", 999],
    ["007", 7],
  ])("accepts %j", (input, value) => expect(parseReceiveQty(input)).toEqual({ ok: true, value }));

  it("asks for a quantity when empty", () => {
    expect(parseReceiveQty("   ")).toMatchObject({ ok: false, error: expect.stringMatching(/how many/i) });
  });

  it.each(["abc", "1.5", "-3", "+4", "1e3", "10 units", "٣"])("rejects non-whole-number %j", (input) => {
    expect(parseReceiveQty(input)).toMatchObject({ ok: false, error: expect.stringMatching(/whole number/i) });
  });

  it("rejects zero and anything above 999", () => {
    expect(parseReceiveQty("0")).toMatchObject({ ok: false, error: expect.stringMatching(/at least 1/) });
    expect(parseReceiveQty("1000")).toMatchObject({ ok: false, error: expect.stringMatching(/999 or less/) });
  });
});

describe("countChange", () => {
  it("is the difference from the POS record for a whole number", () => {
    expect(countChange("3", 4)).toBe(-1);
    expect(countChange(" 6 ", 4)).toBe(2);
    expect(countChange("4", 4)).toBe(0);
  });

  it.each(["", "abc", "1.5", "-2", "100001"])("is null for %j", (input) => expect(countChange(input, 4)).toBeNull());
});

describe("parseAdjustment", () => {
  it("accepts a different count with a reason that fits", () => {
    expect(parseAdjustment({ count: "3", reason: "Damaged" }, 4)).toEqual({ ok: true, target: 3, reason: "Damaged" });
    expect(parseAdjustment({ count: "0", reason: "LostOrStolen" }, 4)).toEqual({ ok: true, target: 0, reason: "LostOrStolen" });
    expect(parseAdjustment({ count: "5", reason: "CustomerReturn" }, 4)).toEqual({ ok: true, target: 5, reason: "CustomerReturn" });
  });

  it.each([
    ["", /how many units you counted/],
    ["abc", /whole number/],
    ["-1", /whole number/],
    ["100001", /100,000 or less/],
    ["4", /already the POS record/],
  ])("explains a bad count %j", (count, message) => {
    expect(parseAdjustment({ count, reason: "Damaged" }, 4)).toEqual({ ok: false, errors: { count: expect.stringMatching(message) } });
  });

  it("asks for a reason", () => {
    expect(parseAdjustment({ count: "3", reason: "" }, 4)).toEqual({ ok: false, errors: { reason: "Choose why the count changed." } });
  });

  it("refuses a reason for the other direction", () => {
    expect(parseAdjustment({ count: "3", reason: "Found" }, 4)).toMatchObject({ ok: false, errors: { reason: expect.any(String) } });
    expect(parseAdjustment({ count: "5", reason: "Damaged" }, 4)).toMatchObject({ ok: false, errors: { reason: expect.any(String) } });
  });
});

describe("parsePartSettings", () => {
  const form = { unitCost: "950", unitPrice: "1,250.50", reorderLevel: "3", reorderQty: "10" };

  it("accepts amounts with commas and up to two decimals", () => {
    expect(parsePartSettings(form)).toEqual({
      ok: true,
      value: { unitCost: 950, unitPrice: 1250.5, reorderLevel: 3, reorderQty: 10 },
    });
  });

  it("leaves blank cost and price unset", () => {
    expect(parsePartSettings({ ...form, unitCost: " ", unitPrice: "" })).toMatchObject({ ok: true, value: { unitCost: null, unitPrice: null } });
  });

  it.each(["abc", "-5", "12.345", "1e3", "10000001"])("refuses the amount %j", (amount) => {
    expect(parsePartSettings({ ...form, unitCost: amount })).toMatchObject({ ok: false, errors: { unitCost: expect.any(String) } });
  });

  it("requires whole-number reorder settings and reports every bad field", () => {
    expect(parsePartSettings({ ...form, reorderLevel: "", reorderQty: "2.5", unitPrice: "x" })).toEqual({
      ok: false,
      errors: {
        unitPrice: expect.stringMatching(/amount like/),
        reorderLevel: expect.stringMatching(/whole number, like 3/),
        reorderQty: expect.stringMatching(/whole number, like 10/),
      },
    });
  });

  it("allows a reorder quantity of 0 (automatic orders off)", () => {
    expect(parsePartSettings({ ...form, reorderQty: "0" })).toMatchObject({ ok: true, value: { reorderQty: 0 } });
  });
});

describe("settingsWarning", () => {
  const base = { unitCost: 950, unitPrice: 1250, reorderLevel: 3, reorderQty: 10 };

  it("is empty for normal settings", () => expect(settingsWarning(base)).toBe(""));
  it("warns about selling below cost", () => expect(settingsWarning({ ...base, unitPrice: 900 })).toMatch(/below the cost/));
  it("explains that 0 turns automatic orders off", () => expect(settingsWarning({ ...base, reorderQty: 0 })).toMatch(/turns automatic orders off/));
  it("says nothing about price while either is unset", () => expect(settingsWarning({ ...base, unitCost: null })).toBe(""));
});
