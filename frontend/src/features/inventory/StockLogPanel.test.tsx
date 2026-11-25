import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../insights/InsightsContext", () => ({ useInsightsData: vi.fn() }));
vi.mock("../insights/hooks", () => ({ useNow: vi.fn(() => new Date(2026, 10, 15, 14, 30)) }));
vi.mock("./hooks", () => ({ useProducts: vi.fn() }));
vi.mock("../auth/AuthContext", () => ({ useAuth: vi.fn(() => ({ user: { uid: "uid-me" } })) }));

import { useInsightsData } from "../insights/InsightsContext";
import type { Movement } from "../insights/types";
import { useProducts } from "./hooks";
import StockLogPanel from "./StockLogPanel";
import type { Product } from "./types";

const at = (daysAgo: number, hour = 10) => new Date(2026, 10, 15 - daysAgo, hour, 0);
const entry = (id: string, daysAgo: number, extra: Partial<Movement> = {}): Movement => ({
  id,
  product: "spark_plug",
  type: "Sale",
  change: -1,
  posBefore: 5,
  posAfter: 4,
  unitCost: 350,
  unitPrice: 500,
  reason: null,
  orderId: null,
  at: at(daysAgo),
  by: "uid-me",
  seeded: false,
  ...extra,
});
const PRODUCTS: Product[] = [
  { id: "spark_plug", name: "Spark Plug", posCount: 4, reorderLevel: 2, reorderQty: 1, unitCost: 350, unitPrice: 500 },
  { id: "petrol_filter", name: "Petrol Filter", posCount: 1, reorderLevel: 0, reorderQty: 10, unitCost: 900, unitPrice: 1200 },
];
const MOVEMENTS: Movement[] = [
  entry("old", 40, { by: "seed_history", seeded: true }),
  entry("week", 5, { type: "Adjustment", reason: "Damaged", by: "uid-other" }),
  entry("filter", 1, { product: "petrol_filter", type: "Receipt", change: 2, posBefore: 1, posAfter: 3 }),
  entry("today", 0, { by: "demo_reset", type: "Reset", change: 0, posBefore: 4, posAfter: 4 }),
];

const provide = (movements: Movement[], extra: { loading?: boolean; error?: string } = {}, products: Product[] = PRODUCTS) => {
  vi.mocked(useInsightsData).mockReturnValue({ movements, orders: [], loadedFrom: at(180), loading: false, error: "", ...extra });
  vi.mocked(useProducts).mockReturnValue({ data: products, loading: false, error: "" });
};

function Address() {
  const location = useLocation();
  return <output data-testid="address">{location.search}</output>;
}

const renderLog = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/products/log${search}`]}>
      <Routes>
        <Route
          path="/products/log"
          element={
            <>
              <StockLogPanel />
              <Address />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

const table = () => screen.getByRole("table", { name: /Stock changes/ });
const bodyRows = () => within(table()).getAllByRole("row").slice(1);
const pressed = (group: string) => within(screen.getByRole("group", { name: group })).getByRole("button", { pressed: true });

describe("StockLogPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the last 30 days newest first, in the shop's words, with who made each change", () => {
    provide(MOVEMENTS);
    renderLog();
    expect(screen.getByRole("heading", { level: 2, name: "Stock Log" })).toBeInTheDocument();
    expect(table()).toHaveAccessibleName("Stock changes the last 30 days, newest first");
    const rows = bodyRows().map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(rows).toEqual([
      ["Spark Plug", "Demo Reset", "0", "4", "4", "Demo Reset script"],
      ["Petrol Filter", "Stock Received", "+2", "1", "3", "You"],
      ["Spark Plug", "Adjustment: Damaged", "-1", "5", "4", "Another user"],
    ]);
    expect(within(bodyRows()[0]).getByRole("rowheader").querySelector("time")).toHaveAttribute("datetime", at(0).toISOString());
    expect(screen.getByText("3 stock changes the last 30 days.")).toBeInTheDocument();
    expect(screen.getByText("All 3 changes shown.")).toBeInTheDocument();
    expect(screen.queryByText("Includes demo data")).not.toBeInTheDocument(); // the seeded entry is older than 30 days
    expect(screen.queryByRole("button", { name: /Show More/ })).not.toBeInTheDocument();
  });

  it("changes period from the filter, counting each period, and keeps it in the address", async () => {
    provide(MOVEMENTS);
    renderLog();
    const periods = screen.getByRole("group", { name: "Period" });
    expect(within(periods).getByRole("button", { name: "Today 1" })).toBeInTheDocument();
    expect(within(periods).getByRole("button", { name: "7 Days 3" })).toBeInTheDocument();
    expect(within(periods).getByRole("button", { name: "90 Days 4" })).toBeInTheDocument();
    await userEvent.click(within(periods).getByRole("button", { name: /90 Days/ }));
    expect(pressed("Period")).toHaveTextContent("90 Days");
    expect(screen.getByTestId("address")).toHaveTextContent("?period=90");
    expect(bodyRows()).toHaveLength(4);
    expect(within(bodyRows()[3]).getByText("Demo data")).toBeInTheDocument();
    expect(screen.getByText("Includes demo data")).toBeInTheDocument();
    await userEvent.click(within(periods).getByRole("button", { name: /Today/ }));
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByTestId("address")).toHaveTextContent("?period=today");
  });

  it("filters by part from the address (the Stock Check History link) and from the filter", async () => {
    provide(MOVEMENTS);
    renderLog("?part=petrol_filter&period=30");
    expect(pressed("Part")).toHaveTextContent("Petrol Filter");
    expect(table()).toHaveAccessibleName("Stock changes the last 30 days for Petrol Filter, newest first");
    expect(bodyRows()).toHaveLength(1);
    expect(within(screen.getByRole("group", { name: "Part" })).getByRole("button", { name: "Spark Plug 2" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("group", { name: "Part" })).getByRole("button", { name: /All Parts/ }));
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByTestId("address")).toHaveTextContent(/^$/); // the defaults leave a clean address
  });

  it("says when the part in the address is unknown, and shows all parts", () => {
    provide(MOVEMENTS);
    renderLog("?part=brake_pad");
    expect(screen.getByText("That part is not in the stock records. Showing all parts.")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(3);
  });

  it("draws 50 rows at a time; Show More adds 50, then focus moves to the footer", async () => {
    const many = Array.from({ length: 120 }, (_, i) => entry(`m${String(i).padStart(3, "0")}`, i % 20, { at: new Date(2026, 10, 15, 0, 0, 120 - i) }));
    provide(many);
    renderLog();
    expect(bodyRows()).toHaveLength(50);
    expect(screen.getByText("Showing the newest 50 of 120 changes.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show More Changes" }));
    expect(bodyRows()).toHaveLength(100);
    await userEvent.click(screen.getByRole("button", { name: "Show More Changes" }));
    expect(bodyRows()).toHaveLength(120);
    const footer = screen.getByText("All 120 changes shown.");
    expect(footer).toHaveFocus();
  });

  it("starts again at one page when the filter changes", async () => {
    const many = Array.from({ length: 60 }, (_, i) => entry(`m${String(i).padStart(3, "0")}`, 0, { at: new Date(2026, 10, 15, 1, 0, i) }));
    provide(many);
    renderLog();
    await userEvent.click(screen.getByRole("button", { name: "Show More Changes" }));
    expect(bodyRows()).toHaveLength(60);
    await userEvent.click(within(screen.getByRole("group", { name: "Period" })).getByRole("button", { name: /7 Days/ }));
    expect(bodyRows()).toHaveLength(50);
  });

  it("shows loading, a load error with its next step, and an empty period that says what to try", () => {
    provide([], { loading: true });
    const first = renderLog();
    expect(screen.getByText("Loading the stock log…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    first.unmount();
    provide([], { error: "Insights could not be loaded." });
    const second = renderLog();
    expect(screen.getByRole("alert")).toHaveTextContent("Check your connection and refresh the page");
    second.unmount();
    provide([entry("old", 40)]);
    const third = renderLog("?period=today");
    expect(screen.getByText("No stock changes today")).toBeInTheDocument();
    expect(screen.getByText(/Choose a longer period to see older changes/)).toBeInTheDocument();
    third.unmount();
    provide([]);
    renderLog("?period=90");
    expect(screen.getByText("No stock changes the last 90 days")).toBeInTheDocument();
    expect(screen.queryByText(/Choose a longer period/)).not.toBeInTheDocument();
  });

  it("hides the part filter when the shop has one part, and names a part no longer in the records from its id", () => {
    provide([entry("gone", 0, { product: "zz_old_part" })], {}, [PRODUCTS[0]]);
    renderLog();
    expect(screen.queryByRole("group", { name: "Part" })).not.toBeInTheDocument();
    expect(within(bodyRows()[0]).getByText("Zz Old Part")).toHaveAttribute("translate", "no");
  });
});
