import { toDate } from "../../shared/firestoreDate";
import type { Alert, AlertState } from "./types";

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isActiveState = (value: unknown): value is AlertState => value === "Open" || value === "Acknowledged";

/** Validates an alerts/{id} document. Returns null for malformed or resolved alerts. */
export function parseAlert(id: string, data: Record<string, unknown> | undefined): Alert | null {
  if (!data || !isActiveState(data.state)) return null;
  if (typeof data.product !== "string" || !data.product) return null;
  if (!isCount(data.visualCount) || !isCount(data.posCount)) return null;
  return {
    id,
    product: data.product,
    visualCount: data.visualCount,
    posCount: data.posCount,
    state: data.state,
    createdAt: toDate(data.createdAt),
  };
}
