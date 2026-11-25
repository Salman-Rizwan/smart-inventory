import { reasonsFor, type AdjustmentReason } from "./movements";
import { MAX_POS_COUNT, MAX_RECEIVE_QTY } from "./stock";
import type { PartSettings } from "./types";

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

export interface AdjustmentForm {
  count: string;
  reason: AdjustmentReason | "";
}

export type AdjustmentResult =
  | { ok: true; target: number; reason: AdjustmentReason }
  | { ok: false; errors: { count?: string; reason?: string } };

/** The change an entered count makes to the POS record, or null while the entry is not a valid count. */
export function countChange(input: string, current: number): number | null {
  const text = input.trim();
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value > MAX_POS_COUNT ? null : value - current;
}

/** Validates Adjust Stock: the count the shopkeeper made, and a reason that fits the direction. */
export function parseAdjustment(form: AdjustmentForm, current: number): AdjustmentResult {
  const text = form.count.trim();
  const errors: { count?: string; reason?: string } = {};
  let target = 0;
  if (!text) errors.count = "Enter how many units you counted, like 3.";
  else if (!/^\d+$/.test(text)) errors.count = "Enter a whole number, like 3.";
  else {
    target = Number(text);
    if (target > MAX_POS_COUNT) errors.count = `The count must be ${formatLimit(MAX_POS_COUNT)} or less.`;
    else if (target === current)
      errors.count = "That is already the POS record. Enter a different count, or press Cancel.";
  }
  if (!errors.count) {
    if (!form.reason) errors.reason = "Choose why the count changed.";
    else if (!reasonsFor(target - current).includes(form.reason))
      errors.reason = "Choose one of the reasons shown for this change.";
  }
  if (errors.count || errors.reason) return { ok: false, errors };
  return { ok: true, target, reason: form.reason as AdjustmentReason };
}

export interface SettingsForm {
  unitCost: string;
  unitPrice: string;
  reorderLevel: string;
  reorderQty: string;
}

export type SettingsResult =
  | { ok: true; value: PartSettings }
  | { ok: false; errors: Partial<Record<keyof SettingsForm, string>> };

export const MAX_MONEY = 10_000_000; // also enforced by firestore.rules

function parseMoney(input: string): { value: number | null } | { error: string } {
  const text = input.trim().replace(/,/g, "");
  if (!text) return { value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { error: "Enter an amount like 1250 or 1250.50." };
  const value = Number(text);
  if (value > MAX_MONEY) return { error: `The amount must be ${formatLimit(MAX_MONEY)} or less.` };
  return { value };
}

function parseSetting(input: string, example: string): { value: number } | { error: string } {
  const text = input.trim();
  if (!text) return { error: `Enter a whole number, like ${example}.` };
  if (!/^\d+$/.test(text)) return { error: `Enter a whole number, like ${example}.` };
  const value = Number(text);
  if (value > MAX_POS_COUNT) return { error: `The number must be ${formatLimit(MAX_POS_COUNT)} or less.` };
  return { value };
}

/** Validates Part Settings. Cost and price may be left blank until known; reorder settings are required. */
export function parsePartSettings(form: SettingsForm): SettingsResult {
  const unitCost = parseMoney(form.unitCost);
  const unitPrice = parseMoney(form.unitPrice);
  const reorderLevel = parseSetting(form.reorderLevel, "3");
  const reorderQty = parseSetting(form.reorderQty, "10");
  const errors: Partial<Record<keyof SettingsForm, string>> = {};
  if ("error" in unitCost) errors.unitCost = unitCost.error;
  if ("error" in unitPrice) errors.unitPrice = unitPrice.error;
  if ("error" in reorderLevel) errors.reorderLevel = reorderLevel.error;
  if ("error" in reorderQty) errors.reorderQty = reorderQty.error;
  if ("error" in unitCost || "error" in unitPrice || "error" in reorderLevel || "error" in reorderQty) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      unitCost: unitCost.value,
      unitPrice: unitPrice.value,
      reorderLevel: reorderLevel.value,
      reorderQty: reorderQty.value,
    },
  };
}

/** A non-blocking note about settings that are allowed but probably a mistake. */
export function settingsWarning(settings: PartSettings): string {
  if (settings.unitCost !== null && settings.unitPrice !== null && settings.unitPrice < settings.unitCost) {
    return "The selling price is below the cost, so each sale loses money. Save anyway if that is intended.";
  }
  if (settings.reorderQty === 0) return "A reorder quantity of 0 turns automatic orders off for this part.";
  return "";
}

const formatLimit = (n: number) => new Intl.NumberFormat().format(n);
