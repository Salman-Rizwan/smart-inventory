import { describe, expect, it } from "vitest";
import { parseOrder } from "./orderParsers";

const stamp = (iso: string) => ({ toDate: () => new Date(iso) });
const valid = { product: "spark_plug", qty: 10, state: "Pending", createdAt: stamp("2026-10-27T05:00:00Z") };

describe("parseOrder", () => {
  it("maps a valid order", () => {
    expect(parseOrder("o1", valid)).toEqual({
      id: "o1",
      product: "spark_plug",
      qty: 10,
      state: "Pending",
      createdAt: new Date("2026-10-27T05:00:00Z"),
    });
  });

  it.each(["Pending", "Accepted", "Dispatched", "Received"])("accepts the %s state", (state) => {
    expect(parseOrder("o1", { ...valid, state })?.state).toBe(state);
  });

  it("tolerates a missing timestamp", () => {
    expect(parseOrder("o1", { ...valid, createdAt: undefined })?.createdAt).toBeNull();
  });

  it.each([
    ["unknown state", { state: "Cancelled" }],
    ["missing state", { state: undefined }],
    ["lower-case state", { state: "pending" }],
    ["empty product", { product: "" }],
    ["non-text product", { product: 3 }],
    ["zero quantity", { qty: 0 }],
    ["negative quantity", { qty: -5 }],
    ["fractional quantity", { qty: 2.5 }],
    ["text quantity", { qty: "10" }],
  ])("rejects %s", (_name, patch) => {
    expect(parseOrder("o1", { ...valid, ...patch })).toBeNull();
  });

  it("rejects a missing document", () => {
    expect(parseOrder("o1", undefined)).toBeNull();
  });
});
