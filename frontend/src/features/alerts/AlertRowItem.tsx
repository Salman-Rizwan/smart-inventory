import { useId, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge from "../../shared/components/StatusBadge";
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
      <tr>
        <th scope="row" translate="no">
          {name}
        </th>
        <td className="num">{formatInteger(alert.visualCount)}</td>
        <td className="num">{formatInteger(alert.posCount)}</td>
        <td className="mono">{formatDateTime(alert.createdAt)}</td>
        <td>
          {alert.state === "Open" ? (
            <StatusBadge kind="warning">Open</StatusBadge>
          ) : (
            <StatusBadge kind="neutral">Acknowledged</StatusBadge>
          )}
        </td>
        <td>
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
