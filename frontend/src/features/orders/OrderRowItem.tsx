import { useId, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { formatDateTime, formatInteger } from "../../shared/format";
import { partLabel } from "../dashboard/parts";
import { orderErrorMessage } from "./orderErrors";
import { advanceOrder } from "./orderRepository";
import { DEALER_ACTIONS, shortId } from "./orderWorkflow";
import type { Order, OrderState } from "./types";

const BADGES: Record<OrderState, BadgeKind> = {
  Pending: "warning",
  Accepted: "info",
  Dispatched: "info",
  Received: "success",
};

export default function OrderRowItem({ order }: { order: Order }) {
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = DEALER_ACTIONS[order.state];
  const part = partLabel(order.product);
  const id = shortId(order.id);

  async function handleAdvance() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      await advanceOrder(order.id, action);
    } catch (err) {
      console.error("Order update failed", err);
      setError(orderErrorMessage(err, id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <th scope="row" className="mono">
          {id}
        </th>
        <td translate="no">{part}</td>
        <td className="num">{formatInteger(order.qty)}</td>
        <td className="mono">{formatDateTime(order.createdAt)}</td>
        <td>
          <StatusBadge kind={BADGES[order.state]}>{order.state}</StatusBadge>
        </td>
        <td>
          {action && (
            <Button
              variant="secondary"
              className="btn--sm"
              onClick={handleAdvance}
              loading={busy}
              loadingLabel="Saving…"
              aria-label={`${action.label}: order ${id}, ${formatInteger(order.qty)} ${part}`}
              aria-describedby={error ? errorId : undefined}
            >
              {action.label}
            </Button>
          )}
        </td>
      </tr>
      {error && (
        <tr className="table__error">
          <td colSpan={6} id={errorId}>
            <Notification kind="error">{error}</Notification>
          </td>
        </tr>
      )}
    </>
  );
}
