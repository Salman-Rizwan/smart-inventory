import { describe, expect, it } from "vitest";
import type { Movement } from "../insights/types";
import {
  byLabel,
  changeLabel,
  DEFAULT_LOG_PERIOD,
  describeLogPeriod,
  filterLog,
  historyHref,
  logPeriodStart,
  logSearch,
  parseLogPeriod,
} from "./stockLog";

const NOW = new Date(2026, 10, 15, 14, 30); // 15 Nov 2026, 14:30 local

const move = (id: string, at: Date, extra: Partial<Movement> = {}): Movement => ({
  id,
  product: "spark_plug",
  type: "Sale",
  change: -1,
  posBefore: 4,
  posAfter: 3,
  unitCost: 350,
  unitPrice: 500,
  reason: null,
  orderId: null,
  at,
  by: "uid-me",
  seeded: false,
  ...extra,
});

describe("parseLogPeriod", () => {
  it("accepts the four periods and falls back to 30 days", () => {
    expect(parseLogPeriod("today")).toBe("today");
    expect(parseLogPeriod("7")).toBe("7");
    expect(parseLogPeriod("90")).toBe("90");
    expect(parseLogPeriod(null)).toBe(DEFAULT_LOG_PERIOD);
    expect(parseLogPeriod("365")).toBe("30");
    expect(parseLogPeriod("Today")).toBe("30");
  });

  it("describes the period for sentences", () => {
    expect(describeLogPeriod("today")).toBe("today");
    expect(describeLogPeriod("7")).toBe("the last 7 days");
  });
});

describe("logPeriodStart", () => {
  it("starts at local midnight, counting today as one of the days", () => {
    expect(logPeriodStart(NOW, "today")).toEqual(new Date(2026, 10, 15));
    expect(logPeriodStart(NOW, "7")).toEqual(new Date(2026, 10, 9));
    expect(logPeriodStart(NOW, "30")).toEqual(new Date(2026, 9, 17));
    expect(logPeriodStart(NOW, "90")).toEqual(new Date(2026, 7, 18));
  });

  it("is midnight even just after midnight", () => {
    expect(logPeriodStart(new Date(2026, 10, 15, 0, 1), "today")).toEqual(new Date(2026, 10, 15));
  });
});

describe("filterLog", () => {
  const today = move("a", new Date(2026, 10, 15, 9, 0));
  const yesterday = move("b", new Date(2026, 10, 14, 23, 59), { product: "petrol_filter" });
  const lastWeek = move("c", new Date(2026, 10, 9, 0, 0)); // exactly the 7-day start: included
  const tooOld = move("d", new Date(2026, 10, 8, 23, 59));
  const all = [tooOld, lastWeek, today, yesterday]; // oldest first as Insights keeps them, but shuffled

  it("keeps the period, newest first, the start included", () => {
    expect(filterLog(all, logPeriodStart(NOW, "7"), null).map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(filterLog(all, logPeriodStart(NOW, "today"), null).map((m) => m.id)).toEqual(["a"]);
  });

  it("filters by part over every entry in the period", () => {
    expect(filterLog(all, logPeriodStart(NOW, "30"), "petrol_filter").map((m) => m.id)).toEqual(["b"]);
    expect(filterLog(all, logPeriodStart(NOW, "30"), "brake_pad")).toEqual([]);
  });

  it("orders entries at the same moment by id, and does not change the input", () => {
    const at = new Date(2026, 10, 15, 10, 0);
    const input = [move("x1", at), move("x2", at)];
    expect(filterLog(input, logPeriodStart(NOW, "today"), null).map((m) => m.id)).toEqual(["x2", "x1"]);
    expect(input.map((m) => m.id)).toEqual(["x1", "x2"]);
  });
});

describe("links", () => {
  it("leaves the defaults out of the address", () => {
    expect(logSearch("30", null)).toEqual({});
    expect(logSearch("today", null)).toEqual({ period: "today" });
    expect(logSearch("30", "spark_plug")).toEqual({ part: "spark_plug" });
    expect(logSearch("90", "petrol_filter")).toEqual({ period: "90", part: "petrol_filter" });
  });

  it("links a Stock Check row to its part's last 30 days", () => {
    expect(historyHref("spark_plug")).toBe("/products/log?part=spark_plug&period=30");
    expect(historyHref("a b&c")).toBe("/products/log?part=a%20b%26c&period=30");
  });
});

describe("byLabel", () => {
  it("names the person, a script or demo data, never an account id", () => {
    expect(byLabel(move("1", NOW), "uid-me")).toBe("You");
    expect(byLabel(move("1", NOW, { by: "uid-other" }), "uid-me")).toBe("Another user");
    expect(byLabel(move("1", NOW), null)).toBe("Another user"); // signed-in user not known yet
    expect(byLabel(move("1", NOW, { by: "demo_reset" }), "uid-me")).toBe("Demo Reset script");
    expect(byLabel(move("1", NOW, { by: "seed_products" }), "uid-me")).toBe("Seed Products script");
    expect(byLabel(move("1", NOW, { by: "seed_history", seeded: true }), "uid-me")).toBe("Demo data");
    expect(byLabel(move("1", NOW, { by: "uid-me", seeded: true }), "uid-me")).toBe("Demo data");
    expect(byLabel(move("1", NOW, { by: "" }), "uid-me")).toBe("Unknown");
  });
});

describe("changeLabel", () => {
  it("uses the shop's words, with the reason for an adjustment", () => {
    expect(changeLabel(move("1", NOW))).toBe("Sale");
    expect(changeLabel(move("1", NOW, { type: "Receipt", change: 2 }))).toBe("Stock Received");
    expect(changeLabel(move("1", NOW, { type: "OrderReceived", change: 10, orderId: "o1" }))).toBe("Order Received");
    expect(changeLabel(move("1", NOW, { type: "Reset", change: 0 }))).toBe("Demo Reset");
    expect(changeLabel(move("1", NOW, { type: "Adjustment", reason: "LostOrStolen" }))).toBe("Adjustment: Lost or Stolen");
    expect(changeLabel(move("1", NOW, { type: "Adjustment", reason: null }))).toBe("Adjustment");
  });
});
