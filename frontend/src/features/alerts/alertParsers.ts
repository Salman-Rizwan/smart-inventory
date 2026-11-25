import { toDate } from "../../shared/firestoreDate";
import type { Alert, AlertState } from "./types";

const STATES: readonly AlertState[] = ["Open", "Acknowledged", "Resolved"];

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isState = (value: unknown): value is AlertState => STATES.includes(value as AlertState);

/** Validates an alerts/{id} document in any state. Returns null for a malformed one. */
export function parseAlert(id: string, data: Record<string, unknown> | undefined): Alert | null {
  if (!data || !isState(data.state)) return null;
  if (typeof data.product !== "string" || !data.product) return null;
  if (!isCount(data.visualCount) || !isCount(data.posCount)) return null;
  return {
    id,
    product: data.product,
    visualCount: data.visualCount,
    posCount: data.posCount,
    state: data.state,
    createdAt: toDate(data.createdAt),
    acknowledgedAt: toDate(data.acknowledgedAt),
    resolvedAt: toDate(data.resolvedAt),
  };
}
