import { MAX_RECEIVE_QTY } from "./stock";

export type QuantityResult = { ok: true; value: number } | { ok: false; error: string };

/** Validates the "Receive Stock" quantity typed by the user. */
export function parseReceiveQty(input: string): QuantityResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "Enter how many units arrived, like 10." };
  if (!/^\d+$/.test(text)) return { ok: false, error: "Enter a whole number, like 10." };
  const value = Number(text);
  if (value < 1) return { ok: false, error: "Quantity must be at least 1." };
  if (value > MAX_RECEIVE_QTY) return { ok: false, error: `Quantity must be ${MAX_RECEIVE_QTY} or less.` };
  return { ok: true, value };
}
