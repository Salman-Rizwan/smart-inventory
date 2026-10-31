import SummaryTiles from "../../shared/components/SummaryTiles";
import { formatInteger } from "../../shared/format";
import { attentionState, ORDER_STATES } from "./orderWorkflow";
import type { OrderRole, OrderState } from "./types";

const HINTS: Record<OrderRole, Record<OrderState, string>> = {
  dealer: {
    Pending: "Needs your action",
    Accepted: "Being prepared",
    Dispatched: "On the way to the shop",
    Received: "Delivered",
  },
  shopkeeper: {
    Pending: "Waiting for the dealer",
    Accepted: "The dealer is preparing it",
    Dispatched: "On the way: confirm when it arrives",
    Received: "Delivered",
  },
};

/** One tile per order state: the number of tiles never grows with the number of orders. */
export default function OrderSummaryTiles({ counts, role }: { counts: Record<OrderState, number>; role: OrderRole }) {
  const attention = attentionState(role);
  return (
    <SummaryTiles
      tiles={ORDER_STATES.map((state) => ({
        label: state,
        value: formatInteger(counts[state]),
        hint: HINTS[role][state],
        attention: state === attention && counts[state] > 0,
      }))}
    />
  );
}
