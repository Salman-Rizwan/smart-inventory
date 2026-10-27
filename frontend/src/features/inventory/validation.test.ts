import { describe, expect, it } from "vitest";
import { parseReceiveQty } from "./validation";

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
