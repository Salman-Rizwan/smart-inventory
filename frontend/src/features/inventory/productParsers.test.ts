import { describe, expect, it } from "vitest";
import { parseProduct } from "./productParsers";

describe("parseProduct", () => {
  it("maps a full document", () => {
    expect(parseProduct("spark_plug", { name: " Spark Plug ", posCount: 3, reorderLevel: 2, reorderQty: 10 })).toEqual({
      id: "spark_plug",
      name: "Spark Plug",
      posCount: 3,
      reorderLevel: 2,
      reorderQty: 10,
    });
  });

  it("falls back to a readable name and zero reorder settings", () => {
    expect(parseProduct("brake_pad", { posCount: 5 })).toEqual({
      id: "brake_pad",
      name: "Brake Pad",
      posCount: 5,
      reorderLevel: 0,
      reorderQty: 0,
    });
  });

  it.each([undefined, {}, { posCount: -1 }, { posCount: 1.5 }, { posCount: "3" }, { posCount: null }, { posCount: NaN }])(
    "rejects an invalid posCount: %j",
    (data) => expect(parseProduct("spark_plug", data as Record<string, unknown> | undefined)).toBeNull(),
  );
});
