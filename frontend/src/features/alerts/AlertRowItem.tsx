import { useId, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge from "../../shared/components/StatusBadge";
import { Cell, ErrorRow, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatDateTime, formatInteger } from "../../shared/format";
import { partLabel } from "../dashboard/parts";
import { acknowledgeAlert } from "./alertRepository";
import { alertErrorMessage } from "./alertErrors";
import type { Alert } from "./types";

export default function AlertRowItem({ alert }: { alert: Alert }) {
  const errorId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = partLabel(alert.product);

  async function handleAcknowledge() {
    setBusy(true);
    setError("");
    try {
      await acknowledgeAlert(alert.id);
    } catch (err) {
      console.error("Acknowledge failed", err);
      setError(alertErrorMessage(err, name));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Row>
        <RowHeader translate="no">{name}</RowHeader>
        <NumCell>{formatInteger(alert.visualCount)}</NumCell>
        <NumCell>{formatInteger(alert.posCount)}</NumCell>
        <Cell mono>{formatDateTime(alert.createdAt)}</Cell>
        <Cell>
          {alert.state === "Open" ? (
            <StatusBadge kind="warning">Open</StatusBadge>
          ) : (
            <StatusBadge kind="neutral">Acknowledged</StatusBadge>
          )}
        </Cell>
        <Cell>
          {alert.state === "Open" && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleAcknowledge}
              loading={busy}
              loadingLabel="Saving…"
              aria-label={`Acknowledge ${name} alert`}
              aria-describedby={error ? errorId : undefined}
            >
              Acknowledge
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
