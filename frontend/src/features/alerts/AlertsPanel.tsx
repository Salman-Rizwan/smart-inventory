import { useMemo } from "react";
import Notification from "../../shared/components/Notification";
import TableScroll from "../../shared/components/TableScroll";
import { DataTable, HeadCell } from "../../shared/components/table";
import StatusBadge from "../../shared/components/StatusBadge";
import AlertRowItem from "./AlertRowItem";
import { useAlerts } from "./AlertsContext";
import { describeOpenCount, sortAlerts } from "./alertSummary";

/** Active alerts for the shopkeeper: a part whose camera count differs from its POS record. */
export default function AlertsPanel() {
  const { alerts, openCount, loading, error } = useAlerts();
  const sorted = useMemo(() => sortAlerts(alerts), [alerts]);
  const showTable = !loading && !error && sorted.length > 0;
  const announcement = loading || error ? "" : describeOpenCount(openCount);

  return (
    <section id="alerts" className={openCount > 0 ? "panel panel--alert" : "panel"} aria-labelledby="alerts-title">
      <div className="panel__header panel__header--split">
        <div>
          <h2 id="alerts-title" tabIndex={-1}>
            Active Alerts
          </h2>
          <p className="muted">Raised when the camera count differs from the POS record.</p>
        </div>
        {openCount > 0 && <StatusBadge kind="warning">{`${openCount} Open`}</StatusBadge>}
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {error && (
        <div className="panel__body">
          <Notification kind="error">{error}</Notification>
        </div>
      )}
      {loading && (
        <p className="empty-state empty-state--compact" role="status">
          Loading alerts…
        </p>
      )}
      {!loading && !error && sorted.length === 0 && (
        <div className="empty-state empty-state--compact">
          <strong>No active alerts</strong>
          Everything on the shelf matches the POS records.
        </div>
      )}
      {showTable && (
        <TableScroll label="Active alerts table">
          <DataTable
            caption="Active alerts, open ones first"
            head={
              <>
                <HeadCell>Part</HeadCell>
                <HeadCell numeric>On Shelf</HeadCell>
                <HeadCell numeric>POS Record</HeadCell>
                <HeadCell>Raised At</HeadCell>
                <HeadCell>Status</HeadCell>
                <HeadCell>Action</HeadCell>
              </>
            }
          >
            {sorted.map((alert) => (
              <AlertRowItem key={alert.id} alert={alert} />
            ))}
          </DataTable>
        </TableScroll>
      )}
    </section>
  );
}
