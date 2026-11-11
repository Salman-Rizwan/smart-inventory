import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useInsights: vi.fn() }));

import { computeInsights, type InsightsReport } from "./analytics";
import { useInsights } from "./hooks";
import InsightsTiles from "./InsightsTiles";
import { insightsLink, tilesFor } from "./tiles";
import type { Movement, OrderTiming } from "./types";

const NOW = new Date(2026, 10, 12, 12, 0);
const at = (daysAgo: number) => new Date(2026, 10, 12 - daysAgo, 10, 0);
const sale = (daysAgo: number, product = "spark_plug", price: number | null = 500): Movement => ({
  id: `m${daysAgo}${product}`,
  product,
  type: "Sale",
  change: -1,
  posBefore: 5,
  posAfter: 4,
  unitCost: 350,
  unitPrice: price,
  reason: null,
  orderId: null,
  at: at(daysAgo),
  by: "seed_history",
  seeded: true,
});
const writeOff = (daysAgo: number): Movement => ({ ...sale(daysAgo), id: `w${daysAgo}`, type: "Adjustment", reason: "Damaged" });
const delivery = (daysAgo: number, lead: number): OrderTiming => ({
  id: `o${daysAgo}`,
  product: "spark_plug",
  qty: 10,
  state: "Received",
  createdAt: new Date(at(daysAgo).getTime() - lead * 86_400_000),
  receivedAt: at(daysAgo),
  seeded: true,
});
const PRODUCTS = [
  { id: "spark_plug", name: "Spark Plug", posCount: 4, reorderLevel: 2, reorderQty: 1, unitCost: 350, unitPrice: 500 },
  { id: "petrol_filter", name: "Petrol Filter", posCount: 1, reorderLevel: 0, reorderQty: 10, unitCost: 900, unitPrice: 1200 },
];

const report = (extra: Partial<Parameters<typeof computeInsights>[0]> = {}): InsightsReport =>
  computeInsights({
    movements: [...Array.from({ length: 15 }, (_, i) => sale(i + 1)), ...Array.from({ length: 10 }, (_, i) => sale(i + 31)), writeOff(2)],
    orders: [delivery(5, 2), delivery(20, 4)],
    products: PRODUCTS,
    counts: { spark_plug: 4, petrol_filter: 1 },
    now: NOW,
    days: 30,
    loadedFrom: new Date(2026, 4, 1),
    ...extra,
  });

describe("tilesFor", () => {
  it("names the four figures with their hints and links to their sections", () => {
    const tiles = tilesFor(report());
    expect(tiles.map((t) => t.label)).toEqual(["Sales", "Shrinkage", "Lowest Days of Cover", "Dealer Lead Time"]);
    expect(tiles[0].value).toMatch(/7,500/); // 15 x 500
    expect(tiles[0].hint).toBe("+50% vs the previous 30 days"); // previous 10 x 500
    expect(tiles[1].value).toMatch(/350/);
    expect(tiles[1].hint).toBe("1 unit written off, 5% of sales");
    expect(tiles[2].value).toBe("8.0 days"); // 4 / (15 / 30)
    expect(tiles[2].hint).toBe("Spark Plug: 4.0 days until the reorder level of 2");
    expect(tiles[2].attention).toBe(false);
    expect(tiles[3].value).toBe("3.0 days");
    expect(tiles[3].hint).toBe("Median of 2 deliveries, order to receipt");
    expect(tiles.map((t) => t.to)).toEqual([
      "/insights?period=30#sales",
      "/insights?period=30#shrinkage",
      "/insights?period=30#cover",
      "/insights?period=30#recommendations",
    ]);
  });

  it("says so when there is nothing to show, never a zero that looks like a figure", () => {
    const tiles = tilesFor(report({ movements: [], orders: [], counts: null }));
    expect(tiles[0].value).toMatch(/0/);
    expect(tiles[0].hint).toBe("No sales in this or the previous period");
    expect(tiles[1].hint).toBe("No write-offs in this period");
    expect(tiles[2].value).toBe("No scan yet");
    expect(tiles[3].value).toBe("No deliveries yet");
  });

  it("flags the lowest cover when a part is already at its reorder level", () => {
    const tiles = tilesFor(report({ counts: { spark_plug: 2, petrol_filter: 1 } }));
    expect(tiles[2].attention).toBe(true);
    expect(tiles[2].hint).toBe("Spark Plug: At or below the reorder level of 2");
  });

  it("builds the section link with the dashboard's period", () => {
    expect(insightsLink("sales")).toBe("/insights?period=30#sales");
    expect(insightsLink("cover", 7)).toBe("/insights?period=7#cover");
  });
});

describe("InsightsTiles", () => {
  beforeEach(() => vi.clearAllMocks());
  const renderTiles = () =>
    render(
      <MemoryRouter>
        <InsightsTiles counts={{ spark_plug: 4, petrol_filter: 1 }} />
      </MemoryRouter>,
    );

  it("shows a loading line and no tiles while loading", () => {
    vi.mocked(useInsights).mockReturnValue({ report: null, loading: true, error: "", now: NOW });
    renderTiles();
    expect(screen.getByRole("status")).toHaveTextContent("Loading insights…");
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
  });

  it("shows the error with its next step", () => {
    vi.mocked(useInsights).mockReturnValue({ report: null, loading: false, error: "Insights could not be loaded. Check your connection.", now: NOW });
    renderTiles();
    expect(screen.getByText(/Insights could not be loaded/)).toBeInTheDocument();
  });

  it("renders the four linked tiles, the demo badge and the link to the page", () => {
    vi.mocked(useInsights).mockReturnValue({ report: report(), loading: false, error: "", now: NOW });
    renderTiles();
    expect(useInsights).toHaveBeenCalledWith(30, null, { spark_plug: 4, petrol_filter: 1 });
    expect(screen.getAllByRole("term")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Sales" })).toHaveAttribute("href", "/insights?period=30#sales");
    expect(screen.getByText("Includes demo data")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Insights" })).toHaveAttribute("href", "/insights?period=30#sales");
  });

  it("shows no demo badge over real data", () => {
    vi.mocked(useInsights).mockReturnValue({ report: report({ movements: [{ ...sale(1), seeded: false }], orders: [] }), loading: false, error: "", now: NOW });
    renderTiles();
    expect(screen.queryByText("Includes demo data")).not.toBeInTheDocument();
  });
});
