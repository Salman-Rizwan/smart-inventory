import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useInsights: vi.fn(), useNow: vi.fn(() => new Date(2026, 10, 12, 12, 0)) }));
vi.mock("./InsightsContext", () => ({ useInsightsData: vi.fn() }));
vi.mock("../dashboard/hooks", () => ({ useLatestStatus: vi.fn() }));
vi.mock("../inventory/hooks", () => ({ useProducts: vi.fn() }));
// The charts library draws with layout measurements jsdom does not have; the stub exposes its data instead.
vi.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({ series }: { series: { label: string; data: number[] }[] }) => (
    <div data-testid="bar-chart">{series.map((s) => `${s.label}: ${s.data.join(",")}`).join(" | ")}</div>
  ),
}));

import { useLatestStatus } from "../dashboard/hooks";
import { useProducts } from "../inventory/hooks";
import { computeInsights, parsePeriod, type InsightsReport } from "./analytics";
import { useInsights } from "./hooks";
import { useInsightsData } from "./InsightsContext";
import InsightsPage from "./InsightsPage";
import type { Movement, OrderTiming } from "./types";

const NOW = new Date(2026, 10, 12, 12, 0);
const at = (daysAgo: number) => new Date(2026, 10, 12 - daysAgo, 10, 0);
const sale = (daysAgo: number, product = "spark_plug"): Movement => ({
  id: `m${daysAgo}${product}`,
  product,
  type: "Sale",
  change: -1,
  posBefore: 5,
  posAfter: 4,
  unitCost: product === "spark_plug" ? 350 : 900,
  unitPrice: product === "spark_plug" ? 500 : 1200,
  reason: null,
  orderId: null,
  at: at(daysAgo),
  by: "seed_history",
  seeded: true,
});
const writeOff = (daysAgo: number, reason: Movement["reason"], product = "spark_plug"): Movement => ({ ...sale(daysAgo, product), id: `w${daysAgo}${product}`, type: "Adjustment", reason });
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
  { id: "petrol_filter", name: "Petrol Filter", posCount: 1, reorderLevel: 0, reorderQty: 10, unitCost: 900, unitPrice: 1200 },
  { id: "spark_plug", name: "Spark Plug", posCount: 4, reorderLevel: 2, reorderQty: 1, unitCost: 350, unitPrice: 500 },
];
const MOVEMENTS = [
  ...Array.from({ length: 15 }, (_, i) => sale(i + 1)),
  ...Array.from({ length: 10 }, (_, i) => sale(i + 31)),
  sale(2, "petrol_filter"),
  writeOff(2, "Damaged"),
  writeOff(3, "LostOrStolen", "petrol_filter"),
];
const ORDERS = [delivery(5, 2), delivery(20, 4)];

const report = (days: 7 | 30 | 90 = 30, part: string | null = null, extra: Partial<Parameters<typeof computeInsights>[0]> = {}): InsightsReport =>
  computeInsights({ movements: MOVEMENTS, orders: ORDERS, products: PRODUCTS, counts: { spark_plug: 4, petrol_filter: 1 }, now: NOW, days, loadedFrom: new Date(2026, 4, 1), part, ...extra });

function Location() {
  const { search, hash } = useLocation();
  return <output data-testid="location">{`${search}${hash}`}</output>;
}

const renderPage = (path = "/insights") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/insights"
          element={
            <>
              <InsightsPage />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const provide = (view: Partial<ReturnType<typeof useInsights>> = {}) => {
  vi.mocked(useInsights).mockImplementation((days, part) => ({ report: report(days, part), loading: false, error: "", now: NOW, ...view }));
  vi.mocked(useInsightsData).mockReturnValue({ movements: MOVEMENTS, orders: ORDERS, loadedFrom: new Date(2026, 4, 1), loading: false, error: "" });
  vi.mocked(useLatestStatus).mockReturnValue({ data: { counts: { spark_plug: 4, petrol_filter: 1 }, scannedAt: at(0) }, loading: false, error: "" });
  vi.mocked(useProducts).mockReturnValue({ data: PRODUCTS, loading: false, error: "" });
};

describe("InsightsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reduced motion on (for focusSection) and the chart's media query answerable (useMediaQuery listens for changes).
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("reads the period from the URL and falls back to 30 days", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("12")).toBe(30);
    expect(parsePeriod(null)).toBe(30);
  });

  describe("states", () => {
    it("shows a loading line and no sections while loading", () => {
      provide({ report: null, loading: true });
      renderPage();
      expect(screen.getByText("Loading insights…")).toHaveAttribute("role", "status");
      expect(screen.queryByRole("heading", { name: "Sales" })).not.toBeInTheDocument();
    });

    it("shows the error with its next step and no figures", () => {
      provide({ report: null, error: "Insights could not be loaded. Check your connection and sign in again if this continues." });
      renderPage();
      expect(screen.getByText(/Insights could not be loaded/)).toBeInTheDocument();
      expect(screen.queryByRole("term")).not.toBeInTheDocument();
    });

    it("explains what to do when there are no stock changes at all", () => {
      provide({ report: report(30, null, { movements: [], orders: [] }) });
      renderPage();
      expect(screen.getByText("No stock changes yet")).toBeInTheDocument();
      expect(screen.getByText(/Record a sale, receive stock or adjust a count/)).toBeInTheDocument();
    });
  });

  describe("with data", () => {
    beforeEach(() => provide());

    it("shows the demo badge, the four tiles and the four sections with their definitions", () => {
      renderPage();
      expect(screen.getByText("Includes demo data")).toBeInTheDocument();
      expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["Sales", "Shrinkage", "Lowest Days of Cover", "Dealer Lead Time"]);
      for (const name of ["Sales", "Shrinkage", "Days of Cover", "Reorder Recommendations"]) {
        expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
      }
      expect(screen.getByText(/net of customer returns, at each sale's own price/)).toBeInTheDocument();
      expect(screen.getByText(/Suggested reorder level = average daily sales/)).toBeInTheDocument();
    });

    it("gives each chart an accessible summary and a table with the same figures", async () => {
      renderPage();
      const salesChart = screen.getByRole("img", { name: /Units sold per day for Petrol Filter and Spark Plug over the last 30 days/ });
      expect(within(salesChart).getByTestId("bar-chart")).toHaveTextContent("Spark Plug: " + [...Array(14).fill(0), ...Array(15).fill(1), 0].join(","));
      await userEvent.click(screen.getByText("Show the Sales Data as a Table"));
      const table = screen.getByRole("table", { name: /Units and value sold per day and part/ });
      const rows = within(table).getAllByRole("row");
      expect(rows).toHaveLength(31);
      expect(within(rows[30]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["0", "0", "0", expect.stringMatching(/0/)]);
      expect(within(rows[29]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["0", "1", "1", expect.stringMatching(/500/)]);

      const shrinkageChart = screen.getByRole("img", { name: /Units written off by reason, Damaged and Lost or Stolen/ });
      expect(within(shrinkageChart).getByTestId("bar-chart")).toHaveTextContent("Petrol Filter: 0,1 | Spark Plug: 1,0");
      await userEvent.click(screen.getByText("Show the Shrinkage Data as a Table"));
      const shrinkTable = screen.getByRole("table", { name: /Units written off and their value at cost/ });
      expect(within(shrinkTable).getAllByRole("row")).toHaveLength(3);
      expect(within(shrinkTable).getByRole("row", { name: /Petrol Filter/ })).toHaveTextContent("Lost or Stolen");
    });

    it("tabulates days of cover and the recommendation per part", () => {
      renderPage();
      const cover = screen.getByRole("table", { name: /Days of cover per part/ });
      const plug = within(cover).getByRole("row", { name: /Spark Plug/ });
      expect(plug).toHaveTextContent("4"); // on shelf
      expect(plug).toHaveTextContent("8.0 days");
      expect(plug).toHaveTextContent("4.0 days until the reorder level of 2");
      const filter = within(cover).getByRole("row", { name: /Petrol Filter/ });
      expect(filter).toHaveTextContent("30 days");

      const rec = screen.getByRole("table", { name: /Suggested reorder level per part/ });
      expect(within(rec).getByRole("row", { name: /Spark Plug/ })).toHaveTextContent("Raise the reorder level from 2 to 3");
      expect(within(rec).getByRole("row", { name: /Petrol Filter/ })).toHaveTextContent("Not enough history yet: 3 of 14 days of history");
      expect(screen.getByText(/Dealer lead time: 3.0 days/)).toBeInTheDocument();
    });

    it("keeps the period and part in the URL and shows units sold on each filter", async () => {
      renderPage();
      const period = screen.getByRole("group", { name: "Period" });
      expect(within(period).getByRole("button", { name: /30 Days/ })).toHaveAttribute("aria-pressed", "true");
      expect(within(period).getByRole("button", { name: /7 Days/ })).toHaveTextContent("7 Days 7");
      expect(within(period).getByRole("button", { name: /30 Days/ })).toHaveTextContent("30 Days 16");
      await userEvent.click(within(period).getByRole("button", { name: /7 Days/ }));
      expect(screen.getByTestId("location")).toHaveTextContent("?period=7");
      expect(useInsights).toHaveBeenLastCalledWith(7, null, { spark_plug: 4, petrol_filter: 1 });

      const part = screen.getByRole("group", { name: "Part" });
      expect(within(part).getByRole("button", { name: /All Parts/ })).toHaveTextContent("All Parts 7");
      await userEvent.click(within(part).getByRole("button", { name: /Petrol Filter/ }));
      expect(screen.getByTestId("location")).toHaveTextContent("?period=7&part=petrol_filter");
      expect(useInsights).toHaveBeenLastCalledWith(7, "petrol_filter", { spark_plug: 4, petrol_filter: 1 });
      await userEvent.click(within(part).getByRole("button", { name: /All Parts/ }));
      await userEvent.click(within(period).getByRole("button", { name: /30 Days/ }));
      expect(screen.getByTestId("location")).toHaveTextContent("");
    });

    it("opens at the URL's period and part", () => {
      renderPage("/insights?period=90&part=spark_plug");
      expect(useInsights).toHaveBeenCalledWith(90, "spark_plug", { spark_plug: 4, petrol_filter: 1 });
      expect(within(screen.getByRole("group", { name: "Period" })).getByRole("button", { name: /90 Days/ })).toHaveAttribute("aria-pressed", "true");
      expect(within(screen.getByRole("group", { name: "Part" })).getByRole("button", { name: /Spark Plug/ })).toHaveAttribute("aria-pressed", "true");
    });

    it("falls back to all parts, and says so, when the URL names an unknown part", () => {
      renderPage("/insights?part=brake_pad");
      expect(screen.getByText(/That part is not in the stock records/)).toBeInTheDocument();
      expect(within(screen.getByRole("group", { name: "Part" })).getByRole("button", { name: /All Parts/ })).toHaveAttribute("aria-pressed", "true");
    });

    it("moves focus to the section a dashboard tile asked for", () => {
      renderPage("/insights?period=30#cover");
      expect(screen.getByRole("heading", { level: 2, name: "Days of Cover" })).toHaveFocus();
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("ignores an unknown hash", () => {
      renderPage("/insights#nowhere");
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it("shows no part filter with a single part, and no shrinkage chart without write-offs", () => {
      provide({ report: report(30, null, { products: [PRODUCTS[1]], movements: MOVEMENTS.filter((m) => m.type === "Sale") }) });
      vi.mocked(useProducts).mockReturnValue({ data: [PRODUCTS[1]], loading: false, error: "" });
      renderPage();
      expect(screen.queryByRole("group", { name: "Part" })).not.toBeInTheDocument();
      expect(screen.getByText(/Nothing was written off in the last 30 days/)).toBeInTheDocument();
      expect(screen.getAllByTestId("bar-chart")).toHaveLength(1);
    });
  });
});
