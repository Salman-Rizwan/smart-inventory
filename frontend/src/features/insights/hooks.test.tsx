import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./InsightsContext", () => ({ useInsightsData: vi.fn() }));
vi.mock("../inventory/hooks", () => ({ useProducts: vi.fn() }));

import { useProducts } from "../inventory/hooks";
import { useInsights } from "./hooks";
import { useInsightsData } from "./InsightsContext";
import type { Movement } from "./types";

const sale = (daysAgo: number): Movement => ({
  id: `m${daysAgo}`,
  product: "spark_plug",
  type: "Sale",
  change: -1,
  posBefore: 5,
  posAfter: 4,
  unitCost: 350,
  unitPrice: 500,
  reason: null,
  orderId: null,
  at: new Date(Date.now() - daysAgo * 86_400_000),
  by: "seed_history",
  seeded: true,
});
const PRODUCT = { id: "spark_plug", name: "Spark Plug", posCount: 4, reorderLevel: 2, reorderQty: 1, unitCost: 350, unitPrice: 500 };

const provide = (data: Partial<ReturnType<typeof useInsightsData>> = {}, products: Partial<ReturnType<typeof useProducts>> = {}) => {
  vi.mocked(useInsightsData).mockReturnValue({
    movements: [sale(1), sale(2)],
    orders: [],
    loadedFrom: new Date(Date.now() - 180 * 86_400_000),
    loading: false,
    error: "",
    ...data,
  });
  vi.mocked(useProducts).mockReturnValue({ data: [PRODUCT], loading: false, error: "", ...products });
};

describe("useInsights", () => {
  it("computes the report once everything has loaded", () => {
    provide();
    const { result } = renderHook(() => useInsights(30, null, { spark_plug: 4 }));
    expect(result.current.loading).toBe(false);
    expect(result.current.report?.sales.units).toBe(2);
    expect(result.current.report?.parts[0].shelf).toBe(4);
    expect(result.current.report?.includesDemo).toBe(true);
  });

  it("has no report while the data or the products load", () => {
    provide({ loading: true });
    expect(renderHook(() => useInsights(30, null, null)).result.current).toMatchObject({ loading: true, report: null });
    provide({}, { data: undefined, loading: true });
    expect(renderHook(() => useInsights(30, null, null)).result.current).toMatchObject({ loading: true, report: null });
  });

  it("passes an error on instead of a report", () => {
    provide({ error: "Insights could not be loaded." });
    const { result } = renderHook(() => useInsights(7, "spark_plug", null));
    expect(result.current.error).toBe("Insights could not be loaded.");
    expect(result.current.report).toBeNull();
  });
});
