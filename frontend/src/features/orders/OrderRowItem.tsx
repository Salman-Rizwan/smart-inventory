import Box from "@mui/material/Box";
import { useId, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { Cell, ErrorRow, NumCell, Row, RowHeader } from "../../shared/components/table";
import { Muted } from "../../shared/components/text";
import { formatDateTime, formatInteger } from "../../shared/format";
import { space } from "../../shared/theme/tokens";
import CancelOrderDialog from "./CancelOrderDialog";
import { performOrderAction } from "./orderActions";
import { orderErrorMessage } from "./orderErrors";
import { actionFor, CANCEL_REASON_LABELS, canCancel, describeOutcome, orderPartName, shortId } from "./orderWorkflow";
import type { Order, OrderRole, OrderState } from "./types";

const BADGES: Record<OrderState, BadgeKind> = {
  Pending: "warning",
  Accepted: "info",
  Dispatched: "info",
  Received: "success",
  Cancelled: "neutral",
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
  const [cancelling, setCancelling] = useState(false);
  const action = actionFor(role, order.state);
  const cancellable = canCancel(role, order.state);
  const part = orderPartName(order);
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
          {order.state === "Cancelled" && order.cancelReason && (
            <Muted component="span" sx={{ display: "block", mt: space(1) }}>
              {CANCEL_REASON_LABELS[order.cancelReason]}
            </Muted>
          )}
        </Cell>
        <Cell>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: space(2) }}>
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
            {cancellable && (
              <Button
                variant="ghost"
                size="small"
                onClick={() => setCancelling(true)}
                aria-label={`Cancel order ${id}, ${formatInteger(order.qty)} ${part}`}
              >
                Cancel Order
              </Button>
            )}
          </Box>
          {cancelling && <CancelOrderDialog order={order} onClose={() => setCancelling(false)} onCancelled={onDone} />}
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
