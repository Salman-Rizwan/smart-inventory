import { useId, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { formatDateTime, formatInteger } from "../../shared/format";
import { partLabel } from "../dashboard/parts";
import { performOrderAction } from "./orderActions";
import { orderErrorMessage } from "./orderErrors";
import { actionFor, describeOutcome, shortId } from "./orderWorkflow";
import type { Order, OrderRole, OrderState } from "./types";

const BADGES: Record<OrderState, BadgeKind> = {
  Pending: "warning",
  Accepted: "info",
  Dispatched: "info",
  Received: "success",
};

interface Props {
  order: Order;
  role: OrderRole;
  onDone: (message: string) => void;
}

export default function OrderRowItem({ order, role, onDone }: Props) {
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = actionFor(role, order.state);
  const part = partLabel(order.product);
  const id = shortId(order.id);

  async function handleAction() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      await performOrderAction(order.id, action);
      onDone(describeOutcome(action, id, order.qty, part));
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
              onClick={handleAction}
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
