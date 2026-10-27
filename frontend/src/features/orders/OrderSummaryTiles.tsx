import { formatInteger } from "../../shared/format";
import { ORDER_STATES } from "./orderWorkflow";
import type { OrderState } from "./types";

const HINTS: Record<OrderState, string> = {
  Pending: "Needs your action",
  Accepted: "Being prepared",
  Dispatched: "On the way to the shop",
  Received: "Delivered",
};

/** One tile per order state: the number of tiles never grows with the number of orders. */
export default function OrderSummaryTiles({ counts }: { counts: Record<OrderState, number> }) {
  return (
    <dl className="kpi-grid">
      {ORDER_STATES.map((state) => (
        <div key={state} className={state === "Pending" && counts.Pending > 0 ? "kpi kpi--attention" : "kpi"}>
          <dt>{state}</dt>
          <dd className="kpi__value">{formatInteger(counts[state])}</dd>
          <dd className="kpi__hint muted">{HINTS[state]}</dd>
        </div>
      ))}
    </dl>
  );
}
