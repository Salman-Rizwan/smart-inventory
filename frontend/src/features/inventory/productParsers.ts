import { partLabel } from "../dashboard/parts";
import type { Product } from "./types";

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** Validates a products/{id} document. Returns null when posCount is missing or invalid. */
export function parseProduct(id: string, data: Record<string, unknown> | undefined): Product | null {
  if (!data || !isCount(data.posCount)) return null;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  return {
    id,
    name: name || partLabel(id),
    posCount: data.posCount,
    reorderLevel: isCount(data.reorderLevel) ? data.reorderLevel : 0,
    reorderQty: isCount(data.reorderQty) ? data.reorderQty : 0,
  };
}
