import { describe, expect, it } from "vitest";
import { parseOrder } from "./orderParsers";

const stamp = (iso: string) => ({ toDate: () => new Date(iso) });
const valid = { product: "spark_plug", qty: 10, state: "Pending", createdAt: stamp("2026-10-27T05:00:00Z") };

describe("parseOrder", () => {
  it("maps a valid order", () => {
    expect(parseOrder("o1", valid)).toEqual({
      id: "o1",
      product: "spark_plug",
      productName: null,
      qty: 10,
      state: "Pending",
      createdAt: new Date("2026-10-27T05:00:00Z"),
      acceptedAt: null,
      dispatchedAt: null,
      cancelledAt: null,
      cancelReason: null,
    });
  });

  it("reads the part name stored on the order, trimmed, and ignores a blank or non-text one", () => {
    expect(parseOrder("o1", { ...valid, productName: " Spark Plug " })?.productName).toBe("Spark Plug");
    expect(parseOrder("o1", { ...valid, productName: "  " })?.productName).toBeNull();
    expect(parseOrder("o1", { ...valid, productName: 7 })?.productName).toBeNull();
  });

  it("reads a cancellation: when and why, ignoring an unknown reason", () => {
    const cancelled = parseOrder("o1", {
      ...valid,
      state: "Cancelled",
      acceptedAt: stamp("2026-10-27T06:00:00Z"),
      cancelledAt: stamp("2026-10-27T07:00:00Z"),
      cancelReason: "OrderedByMistake",
    });
    expect(cancelled).toMatchObject({
      state: "Cancelled",
      acceptedAt: new Date("2026-10-27T06:00:00Z"),
      cancelledAt: new Date("2026-10-27T07:00:00Z"),
      cancelReason: "OrderedByMistake",
    });
    expect(parseOrder("o1", { ...valid, state: "Cancelled", cancelReason: "Because" })?.cancelReason).toBeNull();
  });

  it.each(["Pending", "Accepted", "Dispatched", "Received", "Cancelled"])("accepts the %s state", (state) => {
    expect(parseOrder("o1", { ...valid, state })?.state).toBe(state);
  });

  it("reads the dispatch time when the order has been sent", () => {
    const sent = parseOrder("o1", { ...valid, state: "Dispatched", dispatchedAt: stamp("2026-10-27T07:00:00Z") });
    expect(sent?.dispatchedAt).toEqual(new Date("2026-10-27T07:00:00Z"));
  });

  it("tolerates a missing timestamp", () => {
    expect(parseOrder("o1", { ...valid, createdAt: undefined })?.createdAt).toBeNull();
  });

  it.each([
    ["unknown state", { state: "Declined" }],
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
