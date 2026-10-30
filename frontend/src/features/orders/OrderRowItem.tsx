import { useId, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { Cell, ErrorRow, NumCell, Row, RowHeader } from "../../shared/components/table";
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
      <Row>
        <RowHeader mono>{id}</RowHeader>
        <Cell translate="no">{part}</Cell>
        <NumCell>{formatInteger(order.qty)}</NumCell>
        <Cell mono>{formatDateTime(order.createdAt)}</Cell>
        <Cell>
          <StatusBadge kind={BADGES[order.state]}>{order.state}</StatusBadge>
        </Cell>
        <Cell>
          {action && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleAction}
              loading={busy}
              loadingLabel="Saving…"
              aria-label={`${action.label}: order ${id}, ${formatInteger(order.qty)} ${part}`}
              aria-describedby={error ? errorId : undefined}
            >
              {action.label}
            </Button>
          )}
        </Cell>
      </Row>
      {error && (
        <ErrorRow id={errorId} colSpan={6}>
          <Notification kind="error">{error}</Notification>
        </ErrorRow>
      )}
    </>
  );
}
