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
    });
  });

  it("accepts an acknowledged alert", () => {
    expect(parseAlert("a1", { ...valid, state: "Acknowledged" })?.state).toBe("Acknowledged");
  });

  it("tolerates a missing or pending timestamp", () => {
    expect(parseAlert("a1", { ...valid, createdAt: null })?.createdAt).toBeNull();
    expect(parseAlert("a1", { ...valid, createdAt: undefined })?.createdAt).toBeNull();
  });

  it.each([
    ["resolved", { state: "Resolved" }],
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
