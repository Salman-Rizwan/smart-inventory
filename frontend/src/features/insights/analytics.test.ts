import { describe, expect, it } from "vitest";
import type { Product } from "../inventory/types";
import {
  addDays,
  averageDailySales,
  computeInsights,
  dayKey,
  daysOfCover,
  historyDays,
  leadTime,
  localMidnight,
  median,
  periodDays,
  periodRange,
  recommendLevel,
  saleUnits,
  salesByDay,
  salesChange,
  salesTotals,
  shrinkage,
  WINDOW_DAYS,
} from "./analytics";
import type { Movement, OrderTiming } from "./types";

// Local times: the figures group by the browser's calendar day, so the tests build local dates.
const NOW = new Date(2026, 10, 12, 12, 0); // Nov 12 2026, noon
const at = (daysAgo: number, hour = 10) => new Date(2026, 10, 12 - daysAgo, hour, 0);

let nextId = 1;
const movement = (fields: Partial<Movement> & { at: Date }): Movement => ({
  id: `m${nextId++}`,
  product: "spark_plug",
  type: "Sale",
  change: -1,
  posBefore: 5,
  posAfter: 4,
  unitCost: 350,
  unitPrice: 500,
  reason: null,
  orderId: null,
  by: "seed_history",
  seeded: true,
  ...fields,
});
const sale = (daysAgo: number, extra: Partial<Movement> = {}) => movement({ at: at(daysAgo), ...extra });
const customerReturn = (daysAgo: number, extra: Partial<Movement> = {}) =>
  movement({ at: at(daysAgo), type: "Adjustment", change: 1, reason: "CustomerReturn", ...extra });
const writeOff = (daysAgo: number, reason: Movement["reason"], extra: Partial<Movement> = {}) =>
  movement({ at: at(daysAgo), type: "Adjustment", change: -1, reason, ...extra });

const order = (daysAgo: number, leadDays: number, extra: Partial<OrderTiming> = {}): OrderTiming => ({
  id: `o${nextId++}`,
  product: "spark_plug",
  qty: 10,
  state: "Received",
  createdAt: new Date(at(daysAgo).getTime() - leadDays * 86_400_000),
  receivedAt: at(daysAgo),
  seeded: true,
  ...extra,
});

const product = (id: string, extra: Partial<Product> = {}): Product => ({
  id,
  name: id === "spark_plug" ? "Spark Plug" : "Petrol Filter",
  posCount: 4,
  reorderLevel: 2,
  reorderQty: 10,
  unitCost: 350,
  unitPrice: 500,
  ...extra,
});
const PRODUCTS = [product("spark_plug"), product("petrol_filter", { reorderLevel: 0 })];

describe("periods", () => {
  it("runs from local midnight N-1 days ago up to now, today included", () => {
    const p = periodRange(NOW, 7);
    expect(p.start).toEqual(new Date(2026, 10, 6, 0, 0));
    expect(p.end).toBe(NOW);
    expect(p.previousStart).toEqual(new Date(2026, 10, 6 - 7, 0, 0));
    expect(periodDays(p).map(dayKey)).toEqual([
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ]);
  });

  it("counts calendar days, not 24-hour blocks, across a month boundary", () => {
    expect(periodRange(NOW, 30).start).toEqual(new Date(2026, 9, 14, 0, 0));
    expect(periodDays(periodRange(NOW, 90))).toHaveLength(90);
  });

  it("keeps the time of day when adding days and finds local midnight", () => {
    expect(addDays(new Date(2026, 0, 31, 9, 30), 1)).toEqual(new Date(2026, 1, 1, 9, 30));
    expect(localMidnight(new Date(2026, 5, 3, 23, 59))).toEqual(new Date(2026, 5, 3, 0, 0));
  });

  it("loads enough history for a 90-day period and its previous period", () => {
    expect(WINDOW_DAYS).toBeGreaterThanOrEqual(180);
  });
});

describe("median", () => {
  it("handles none, odd and even counts", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("sales", () => {
  it("counts a sale as one unit at its own price and a return as minus one", () => {
    expect(saleUnits(sale(1))).toBe(1);
    expect(saleUnits(customerReturn(1))).toBe(-1);
    expect(saleUnits(writeOff(1, "Damaged"))).toBeNull();
    expect(saleUnits(movement({ at: at(1), type: "Reset", change: -3 }))).toBeNull();
    expect(saleUnits(movement({ at: at(1), type: "Receipt", change: 10 }))).toBeNull();
  });

  it("totals the period net of returns, leaving out resets and receipts", () => {
    const p = periodRange(NOW, 7);
    const totals = salesTotals(
      [sale(1), sale(2), customerReturn(3), movement({ at: at(2), type: "Reset", change: -4 }), sale(10)],
      p.start,
      p.end,
    );
    expect(totals).toEqual({ units: 1, value: 500, unpriced: 0 });
  });

  it("uses each entry's own price, so a price change mid-period never rewrites the past", () => {
    const p = periodRange(NOW, 7);
    const totals = salesTotals([sale(1, { unitPrice: 600 }), sale(2, { unitPrice: 500 })], p.start, p.end);
    expect(totals.value).toBe(1100);
  });

  it("counts an unpriced sale in units but not in value, and says how many", () => {
    const p = periodRange(NOW, 7);
    const totals = salesTotals([sale(1, { unitPrice: null }), sale(2)], p.start, p.end);
    expect(totals).toEqual({ units: 2, value: 500, unpriced: 1 });
  });

  it("filters to one part", () => {
    const p = periodRange(NOW, 7);
    const list = [sale(1), sale(1, { product: "petrol_filter", unitPrice: 1200 })];
    expect(salesTotals(list, p.start, p.end, "petrol_filter")).toEqual({ units: 1, value: 1200, unpriced: 0 });
  });

  it("gives every day of the period a row, with zeros on quiet days and a negative net day", () => {
    const p = periodRange(NOW, 7);
    const rows = salesByDay([sale(0), sale(0), customerReturn(3), customerReturn(3), sale(3)], p, ["spark_plug", "petrol_filter"]);
    expect(rows).toHaveLength(7);
    expect(rows[6].total).toEqual({ units: 2, value: 1000, unpriced: 0 });
    expect(rows[3].total).toEqual({ units: -1, value: -500, unpriced: 0 });
    expect(rows[3].byPart.petrol_filter).toEqual({ units: 0, value: 0, unpriced: 0 });
    expect(rows[1].total.units).toBe(0);
  });

  it("ignores entries for a part that is not listed", () => {
    const p = periodRange(NOW, 7);
    const rows = salesByDay([sale(0, { product: "brake_pad" })], p, ["spark_plug"]);
    expect(rows[6].total.units).toBe(0);
  });

  it("describes the change against the previous period", () => {
    expect(salesChange(1200, 1000, true)).toEqual({ kind: "change", percent: 20 });
    expect(salesChange(500, 1000, true)).toEqual({ kind: "change", percent: -50 });
    expect(salesChange(800, 0, true)).toEqual({ kind: "new" });
    expect(salesChange(0, 0, true)).toEqual({ kind: "none" });
    expect(salesChange(800, 0, false)).toEqual({ kind: "unknown" });
  });
});

describe("shrinkage", () => {
  const p = periodRange(NOW, 30);
  const parts = ["spark_plug", "petrol_filter"];

  it("sums write-offs by part and reason at each entry's own cost, as a share of sales value", () => {
    const list = [
      writeOff(1, "Damaged"),
      writeOff(2, "Damaged", { unitCost: 400 }),
      writeOff(3, "LostOrStolen", { product: "petrol_filter", unitCost: 900 }),
      writeOff(4, "Miscount"), // a record correction, not shrinkage
      customerReturn(5),
      sale(6),
      writeOff(40, "Damaged"), // outside the period
    ];
    const report = shrinkage(list, p.start, p.end, parts, 10_000);
    expect(report.lines).toEqual([
      { part: "spark_plug", reason: "Damaged", units: 2, value: 750, uncosted: 0 },
      { part: "petrol_filter", reason: "LostOrStolen", units: 1, value: 900, uncosted: 0 },
    ]);
    expect(report.units).toBe(3);
    expect(report.value).toBe(1650);
    expect(report.shareOfSales).toBeCloseTo(0.165);
  });

  it("has no share when there were no sales, and counts uncosted units separately", () => {
    const report = shrinkage([writeOff(1, "Damaged", { unitCost: null })], p.start, p.end, parts, 0);
    expect(report.shareOfSales).toBeNull();
    expect(report.units).toBe(1);
    expect(report.value).toBe(0);
    expect(report.uncosted).toBe(1);
    expect(report.lines[0].uncosted).toBe(1);
  });

  it("filters to one part", () => {
    const list = [writeOff(1, "Damaged"), writeOff(2, "Damaged", { product: "petrol_filter", unitCost: 900 })];
    expect(shrinkage(list, p.start, p.end, parts, 0, "petrol_filter").value).toBe(900);
  });
});

describe("days of cover", () => {
  it("divides the shelf count by the average daily sales and says how long until the reorder level", () => {
    expect(averageDailySales(30, 30)).toBe(1);
    expect(daysOfCover(4, 1, 2)).toEqual({ kind: "cover", days: 4, untilReorder: 2 });
    expect(daysOfCover(1, 0.5, 2)).toEqual({ kind: "cover", days: 2, untilReorder: 0 });
  });

  it("says when there are no sales to divide by, or no scan yet", () => {
    expect(daysOfCover(4, 0, 2)).toEqual({ kind: "no-sales" });
    expect(daysOfCover(4, -0.1, 2)).toEqual({ kind: "no-sales" });
    expect(daysOfCover(null, 1, 2)).toEqual({ kind: "no-scan" });
  });
});

describe("lead time", () => {
  const p = periodRange(NOW, 30);

  it("is the median of received minus created over orders received in the period", () => {
    const list = [order(1, 2), order(5, 4), order(9, 3), order(40, 10)];
    expect(leadTime(list, p.start, p.end)).toEqual({ days: 3, deliveries: 3 });
  });

  it("skips orders that are not received or have no times, and is null with none", () => {
    const list = [order(1, 2, { state: "Dispatched" }), order(2, 2, { createdAt: null })];
    expect(leadTime(list, p.start, p.end)).toBeNull();
    expect(leadTime([], p.start, p.end)).toBeNull();
  });

  it("can be limited to one part and never goes negative", () => {
    const list = [order(1, 2), order(2, -1, { product: "petrol_filter" })];
    expect(leadTime(list, p.start, p.end, "petrol_filter")).toEqual({ days: 0, deliveries: 1 });
  });
});

describe("recommendation", () => {
  it("is lead-time demand plus half again as a margin, rounded up", () => {
    expect(recommendLevel(1, { days: 3, deliveries: 3 }, 30)).toEqual({ kind: "ok", level: 5, leadDemand: 3, safety: 2 });
    expect(recommendLevel(1 / 3, { days: 3, deliveries: 2 }, 30)).toEqual({ kind: "ok", level: 2, leadDemand: 1, safety: 1 });
  });

  it("keeps a margin of at least one unit", () => {
    expect(recommendLevel(0.1, { days: 2, deliveries: 2 }, 30)).toEqual({ kind: "ok", level: 2, leadDemand: 0.2, safety: 1 });
  });

  it("asks for 14 days of history and 2 deliveries first, saying what there is", () => {
    expect(recommendLevel(1, { days: 3, deliveries: 3 }, 13.9)).toEqual({ kind: "not-enough", historyDays: 13, deliveries: 3 });
    expect(recommendLevel(1, { days: 3, deliveries: 1 }, 30)).toEqual({ kind: "not-enough", historyDays: 30, deliveries: 1 });
    expect(recommendLevel(1, null, 30)).toEqual({ kind: "not-enough", historyDays: 30, deliveries: 0 });
  });

  it("has nothing to suggest without sales", () => {
    expect(recommendLevel(0, { days: 3, deliveries: 2 }, 30)).toEqual({ kind: "no-sales" });
  });

  it("measures history from the part's oldest record of any type", () => {
    const list = [sale(3), movement({ at: at(20), type: "Receipt", change: 10 }), sale(1, { product: "petrol_filter" })];
    expect(historyDays(list, "spark_plug", NOW)).toBeCloseTo(20 + 2 / 24);
    expect(historyDays(list, "brake_pad", NOW)).toBe(0);
  });
});

describe("computeInsights", () => {
  const movements = [
    ...Array.from({ length: 20 }, (_, i) => sale(i + 1)), // 20 plug sales in the last 20 days
    ...Array.from({ length: 10 }, (_, i) => sale(i + 31)), // 10 more in the previous period
    customerReturn(2),
    writeOff(4, "Damaged"),
    sale(3, { product: "petrol_filter", unitPrice: 1200, unitCost: 900 }),
    movement({ at: at(25), type: "OrderReceived", change: 10, orderId: "o1" }),
    movement({ at: at(28), type: "Receipt", change: 10, product: "petrol_filter", seeded: false }),
  ];
  const orders = [order(25, 3), order(10, 2), order(50, 4)];
  const input = {
    movements,
    orders,
    products: PRODUCTS,
    counts: { spark_plug: 4, petrol_filter: 1 },
    now: NOW,
    days: 30 as const,
    loadedFrom: addDays(NOW, -WINDOW_DAYS),
  };

  it("builds every figure for the period", () => {
    const report = computeInsights(input);
    expect(report.sales).toEqual({ units: 20, value: 10_700, unpriced: 0 }); // 19 net plug sales + 1 filter
    expect(report.change).toEqual({ kind: "change", percent: 114 }); // previous: 10 sales = 5,000
    expect(report.shrinkage.units).toBe(1);
    expect(report.shrinkage.value).toBe(350);
    expect(report.lead).toEqual({ days: 2.5, deliveries: 2 });
    expect(report.byDay).toHaveLength(30);
    expect(report.includesDemo).toBe(true);

    const plug = report.parts[0];
    expect(plug.part).toBe("spark_plug");
    expect(plug.averageDaily).toBeCloseTo(19 / 30);
    expect(plug.cover).toEqual({ kind: "cover", days: 4 / (19 / 30), untilReorder: 2 / (19 / 30) });
    expect(plug.recommendation).toEqual({ kind: "ok", level: 3, leadDemand: 2.5 * (19 / 30), safety: 1 });

    const filter = report.parts[1];
    expect(filter.cover.kind).toBe("cover");
    expect(filter.recommendation).toEqual({ kind: "ok", level: 2, leadDemand: 2.5 / 30, safety: 1 });
    expect(report.lowestCover?.part).toBe("spark_plug");
  });

  it("marks a period without seeded records as real data", () => {
    const real = computeInsights({ ...input, days: 7, movements: [sale(1, { seeded: false })], orders: [] });
    expect(real.includesDemo).toBe(false);
  });

  it("limits everything to the chosen part", () => {
    const report = computeInsights({ ...input, part: "petrol_filter" });
    expect(report.parts.map((p) => p.part)).toEqual(["petrol_filter"]);
    expect(report.sales).toEqual({ units: 1, value: 1200, unpriced: 0 });
    expect(report.shrinkage.units).toBe(0);
    expect(Object.keys(report.byDay[0].byPart)).toEqual(["petrol_filter"]);
    expect(report.change).toEqual({ kind: "new" });
  });

  it("handles no scan yet, no sales and a short history without breaking", () => {
    const report = computeInsights({ ...input, counts: null, movements: [sale(1)], orders: [] });
    expect(report.parts[0].cover).toEqual({ kind: "no-scan" });
    expect(report.parts[1].cover).toEqual({ kind: "no-scan" });
    expect(report.parts[0].recommendation).toEqual({ kind: "not-enough", historyDays: 1, deliveries: 0 });
    expect(report.lowestCover).toBeNull();
    expect(report.lead).toBeNull();
    expect(report.change).toEqual({ kind: "new" });
  });

  it("cannot compare with a previous period that was never loaded", () => {
    const report = computeInsights({ ...input, loadedFrom: addDays(NOW, -40) });
    expect(report.change).toEqual({ kind: "unknown" });
  });

  it("works with no products at all", () => {
    const report = computeInsights({ ...input, products: [] });
    expect(report.parts).toEqual([]);
    expect(report.lowestCover).toBeNull();
  });
});
