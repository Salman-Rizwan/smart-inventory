import { describe, expect, it } from "vitest";
import { parseAlert } from "./alertParsers";

const stamp = (iso: string) => ({ toDate: () => new Date(iso) });
const valid = { product: "spark_plug", visualCount: 3, posCount: 4, state: "Open", createdAt: stamp("2026-10-27T05:00:00Z") };

describe("parseAlert", () => {
  it("maps a valid open alert", () => {
    expect(parseAlert("a1", valid)).toEqual({
      id: "a1",
      product: "spark_plug",
      visualCount: 3,
      posCount: 4,
      state: "Open",
      createdAt: new Date("2026-10-27T05:00:00Z"),
      acknowledgedAt: null,
      resolvedAt: null,
    });
  });

  it("accepts an acknowledged alert, with when it was acknowledged", () => {
    const parsed = parseAlert("a1", { ...valid, state: "Acknowledged", acknowledgedAt: stamp("2026-10-27T06:00:00Z") });
    expect(parsed?.state).toBe("Acknowledged");
    expect(parsed?.acknowledgedAt).toEqual(new Date("2026-10-27T06:00:00Z"));
  });

  it("accepts a resolved alert for the history, with when it was resolved", () => {
    const parsed = parseAlert("a1", { ...valid, state: "Resolved", resolvedAt: stamp("2026-10-27T07:00:00Z") });
    expect(parsed?.state).toBe("Resolved");
    expect(parsed?.resolvedAt).toEqual(new Date("2026-10-27T07:00:00Z"));
    expect(parsed?.acknowledgedAt).toBeNull(); // resolved without ever being acknowledged
  });

  it("ignores a malformed timestamp rather than rejecting the alert", () => {
    expect(parseAlert("a1", { ...valid, resolvedAt: "yesterday" })?.resolvedAt).toBeNull();
  });

  it("tolerates a missing or pending timestamp", () => {
    expect(parseAlert("a1", { ...valid, createdAt: null })?.createdAt).toBeNull();
    expect(parseAlert("a1", { ...valid, createdAt: undefined })?.createdAt).toBeNull();
  });

  it.each([
    ["unknown state", { state: "Closed" }],
    ["missing state", { state: undefined }],
    ["empty product", { product: "" }],
    ["non-text product", { product: 7 }],
    ["negative count", { visualCount: -1 }],
    ["fractional count", { posCount: 1.5 }],
    ["text count", { visualCount: "3" }],
  ])("rejects %s", (_name, patch) => {
    expect(parseAlert("a1", { ...valid, ...patch })).toBeNull();
  });

  it("rejects a missing document", () => {
    expect(parseAlert("a1", undefined)).toBeNull();
  });
});
