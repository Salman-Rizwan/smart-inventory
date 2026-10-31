import Box from "@mui/material/Box";
import { useMemo } from "react";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelHeader } from "../../shared/components/Panel";
import TableScroll from "../../shared/components/TableScroll";
import { DataTable, HeadCell } from "../../shared/components/table";
import StatusBadge from "../../shared/components/StatusBadge";
import { layout, space } from "../../shared/theme/tokens";
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
    <Panel id="alerts" tone={openCount > 0 ? "alert" : undefined} aria-labelledby="alerts-title">
      <PanelHeader split>
        <div>
          {/* Focused when a notification opens this panel: keep it clear of the sticky header. */}
          <Box
            component="h2"
            id="alerts-title"
            tabIndex={-1}
            sx={{ scrollMarginTop: `calc(${layout.headerHeight} + ${space(4)})` }}
          >
            Active Alerts
          </Box>
          <p className="muted">Raised when the camera count differs from the POS record.</p>
        </div>
        {openCount > 0 && <StatusBadge kind="warning">{`${openCount} Open`}</StatusBadge>}
      </PanelHeader>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {error && (
        <PanelBody>
          <Notification kind="error">{error}</Notification>
        </PanelBody>
      )}
      {loading && (
        <EmptyState component="p" role="status" compact>
          Loading alerts…
        </EmptyState>
      )}
      {!loading && !error && sorted.length === 0 && (
        <EmptyState title="No active alerts" compact>
          Everything on the shelf matches the POS records.
        </EmptyState>
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
    </Panel>
  );
}
