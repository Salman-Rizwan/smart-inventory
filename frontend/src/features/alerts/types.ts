export type AlertState = "Open" | "Acknowledged";

export interface Alert {
  id: string;
  product: string; // the model's class name, e.g. "spark_plug"
  visualCount: number;
  posCount: number;
  state: AlertState;
  createdAt: Date | null;
}
