import type { AdjustmentReason, MovementType } from "../inventory/movements";

/** A stock_movements entry as Insights reads it (see README, data model). */
export interface Movement {
  id: string;
  product: string;
  type: MovementType;
  change: number; // signed
  posBefore: number;
  posAfter: number;
  unitCost: number | null; // as at the change; null when no cost was set then
  unitPrice: number | null;
  reason: AdjustmentReason | null;
  orderId: string | null;
  at: Date;
  by: string;
  seeded: boolean; // demo data written by seed_history
}

/** The part of a purchase order that the lead-time figures need. */
export interface OrderTiming {
  id: string;
  product: string;
  qty: number;
  state: string;
  createdAt: Date | null;
  receivedAt: Date | null;
  seeded: boolean;
}
