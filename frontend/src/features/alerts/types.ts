export type AlertState = "Open" | "Acknowledged" | "Resolved";

export interface Alert {
  id: string;
  product: string; // the model's class name, e.g. "spark_plug"
  visualCount: number; // while active, the latest counts; once resolved, the last mismatch seen
  posCount: number;
  state: AlertState;
  createdAt: Date | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}
