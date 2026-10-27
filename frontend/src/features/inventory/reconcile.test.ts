import { describe, expect, it } from "vitest";
import { buildStockRows, stockState } from "./reconcile";
import type { Product } from "./types";

const product = (id: string, name: string, posCount: number): Product => ({
  id,
  name,
  posCount,
  reorderLevel: 2,
  reorderQty: 10,
});

describe("stockState", () => {
  it.each([
    [3, 3, "matched"],
    [0, 0, "matched"],
    [4, 3, "mismatch"],
    [2, 3, "mismatch"],
    [0, 1, "mismatch"],
  ] as const)("shelf %i vs POS %i -> %s", (visual, pos, expected) => {
    expect(stockState(visual, pos)).toBe(expected);
  });

  it("is unscanned before the first scan", () => {
    expect(stockState(null, 3)).toBe("unscanned");
  });
});

describe("buildStockRows", () => {
  const products = [product("spark_plug", "Spark Plug", 3), product("petrol_filter", "Petrol Filter", 1)];

  it("flags a sale that was recorded without removing the plug (POS 3, shelf 4)", () => {
    const rows = buildStockRows(products, { spark_plug: 4, petrol_filter: 1 });
    const spark = rows.find((r) => r.product.id === "spark_plug");
    expect(spark).toMatchObject({ visual: 4, difference: 1, state: "mismatch" });
  });

  it("matches again once the shelf agrees with the POS", () => {
    const rows = buildStockRows(products, { spark_plug: 3, petrol_filter: 1 });
    expect(rows.every((r) => r.state === "matched")).toBe(true);
  });

  it("reports a negative difference when the POS claims stock that is not on the shelf", () => {
    const rows = buildStockRows(products, { spark_plug: 2, petrol_filter: 1 });
    expect(rows.find((r) => r.product.id === "spark_plug")?.difference).toBe(-1);
  });

  it("marks every part unscanned when there are no counts yet", () => {
    const rows = buildStockRows(products, null);
    expect(rows.map((r) => r.state)).toEqual(["unscanned", "unscanned"]);
    expect(rows.every((r) => r.visual === null && r.difference === null)).toBe(true);
  });

  it("treats a part the scan did not report as unscanned, not as zero", () => {
    const rows = buildStockRows(products, { spark_plug: 3 });
    expect(rows.find((r) => r.product.id === "petrol_filter")?.state).toBe("unscanned");
  });

  it("sorts by name so row order is stable", () => {
    expect(buildStockRows(products, null).map((r) => r.product.name)).toEqual(["Petrol Filter", "Spark Plug"]);
  });
});
