import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Each block is replaced by a stub that names itself, so this test is about the page: its order and what it passes on.
vi.mock("./CameraStatus", () => ({ default: () => <p>camera status</p> }));
vi.mock("./ScanControl", () => ({ default: () => <button>Scan Now</button> }));
vi.mock("./SnapshotPanel", () => ({ default: ({ scannedAt }: { scannedAt: Date | null }) => <section><h2>Latest Shelf Image</h2><p>{scannedAt ? "has scan" : "no scan"}</p></section> }));
vi.mock("./ScanHistoryTable", () => ({ default: ({ scans }: { scans: unknown[] }) => <section><h2>Recent Scans</h2><p>{scans.length} scans</p></section> }));
vi.mock("../alerts/AlertsSummary", () => ({ default: ({ mismatches }: { mismatches: number }) => <section><h2>Active Alerts</h2><p>{mismatches} mismatches</p></section> }));
vi.mock("../insights/InsightsTiles", () => ({ default: ({ counts }: { counts: unknown }) => <section><h2>Business at a Glance</h2><p>{JSON.stringify(counts)}</p></section> }));
vi.mock("../inventory/StockCheckPanel", () => ({
  default: (props: { counts: unknown; countStatus: unknown; countedAt: unknown }) => (
    <section>
      <h2>Stock Check</h2>
      <p data-testid="stock-props">{JSON.stringify({ counts: props.counts, countStatus: props.countStatus, countedAt: props.countedAt })}</p>
    </section>
  ),
}));
vi.mock("./hooks", () => ({ useLatestStatus: vi.fn(), useRecentScans: vi.fn() }));
vi.mock("../inventory/hooks", () => ({ useProducts: vi.fn() }));

import { useProducts } from "../inventory/hooks";
import DashboardPage from "./DashboardPage";
import { useLatestStatus, useRecentScans } from "./hooks";

const SCANNED = new Date("2026-11-12T10:00:00Z");
const provide = (status: Record<string, unknown> = {}) => {
  vi.mocked(useLatestStatus).mockReturnValue({ data: { counts: { spark_plug: 4, petrol_filter: 1 }, scannedAt: SCANNED }, loading: false, error: "", ...status } as never);
  vi.mocked(useRecentScans).mockReturnValue({ data: [{ id: "s1" }, { id: "s2" }], loading: false, error: "" } as never);
  vi.mocked(useProducts).mockReturnValue({
    data: [
      { id: "spark_plug", name: "Spark Plug", posCount: 3, reorderLevel: 2, reorderQty: 1, unitCost: 350, unitPrice: 500 },
      { id: "petrol_filter", name: "Petrol Filter", posCount: 1, reorderLevel: 0, reorderQty: 10, unitCost: 900, unitPrice: 1200 },
    ],
    loading: false,
    error: "",
  });
};

describe("DashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is ordered as the shopkeeper asks: alerts, the business, stock, then what the camera saw", () => {
    provide();
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Shelf Overview" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Active Alerts",
      "Business at a Glance",
      "Stock Check",
      "Latest Shelf Image",
      "Recent Scans",
    ]);
  });

  it("no longer carries the duplicate counts or Part Settings, which now live in Stock Check and Products", () => {
    provide();
    render(<DashboardPage />);
    expect(screen.queryByRole("heading", { name: "Current Counts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Part Settings" })).not.toBeInTheDocument();
  });

  it("passes the live counts and their status on, and counts the mismatches against the POS", () => {
    provide();
    render(<DashboardPage />);
    expect(screen.getByText("1 mismatches")).toBeInTheDocument(); // spark plug: shelf 4, POS 3
    expect(screen.getAllByText('{"spark_plug":4,"petrol_filter":1}', { exact: false })).toHaveLength(2); // the tiles and Stock Check both get the counts
    expect(JSON.parse(screen.getByTestId("stock-props").textContent ?? "")).toEqual({
      counts: { spark_plug: 4, petrol_filter: 1 },
      countStatus: { loading: false, error: "" },
      countedAt: SCANNED.toISOString(),
    });
    expect(screen.getByText("has scan")).toBeInTheDocument();
    expect(screen.getByText("2 scans")).toBeInTheDocument();
  });

  it("hands a count error or a first load to Stock Check, which shows them", () => {
    provide({ data: undefined, loading: true });
    const { unmount } = render(<DashboardPage />);
    expect(JSON.parse(screen.getByTestId("stock-props").textContent ?? "").countStatus).toEqual({ loading: true, error: "" });
    expect(screen.getByText("no scan")).toBeInTheDocument();
    unmount();
    provide({ data: undefined, loading: false, error: "Live data could not be loaded." });
    render(<DashboardPage />);
    expect(JSON.parse(screen.getByTestId("stock-props").textContent ?? "")).toMatchObject({ counts: null, countStatus: { error: "Live data could not be loaded." } });
  });
});
