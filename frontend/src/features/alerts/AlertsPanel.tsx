import { useMemo } from "react";
import Notification from "../../shared/components/Notification";
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
        <div className="table-scroll">
          <table className="table">
            <caption className="visually-hidden">Active alerts, open ones first</caption>
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col" className="num">On Shelf</th>
                <th scope="col" className="num">POS Record</th>
                <th scope="col">Raised At</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((alert) => (
                <AlertRowItem key={alert.id} alert={alert} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
