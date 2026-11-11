import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../shared/components/Button";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../shared/components/Panel";
import StatusBadge from "../../shared/components/StatusBadge";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { formatDateTime, formatInteger } from "../../shared/format";
import { color, font, space, text } from "../../shared/theme/tokens";
import { partLabel } from "../dashboard/parts";
import { useAlerts } from "./AlertsContext";
import { dashboardAlerts, describeOpenCount } from "./alertSummary";
import type { Alert } from "./types";
import { useAcknowledge } from "./useAcknowledge";

/** How many active alerts the dashboard lists; the rest are on the Alerts page. */
export const DASHBOARD_ALERT_LIMIT = 5;

const List = styled("ul")({ listStyle: "none", margin: 0, padding: 0 });

/** One line per alert: part, counts, when raised, status, action. Wraps onto two lines when narrow. */
const Line = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  columnGap: space(5),
  rowGap: space(2),
  padding: `${space(3)} ${space(5)}`,
});

const Mono = styled("span")({ fontFamily: font.mono, fontVariantNumeric: "tabular-nums", fontSize: text.sm });

function SummaryItem({ alert, onDone }: { alert: Alert; onDone: (message: string) => void }) {
  const errorId = useId();
  const name = partLabel(alert.product);
  const { busy, error, acknowledge } = useAcknowledge(alert.id, name, onDone);

  return (
    <Box component="li" sx={{ "& + &": { borderTop: `1px solid ${color.border}` } }}>
      <Line>
        <Box component="strong" translate="no" sx={{ minWidth: "9rem" }}>
          {name}
        </Box>
        <Mono>
          On shelf {formatInteger(alert.visualCount)}, POS {formatInteger(alert.posCount)}
        </Mono>
        <Mono sx={{ color: color.inkMuted, flex: 1, whiteSpace: "nowrap" }}>
          <VisuallyHidden>Raised </VisuallyHidden>
          <time dateTime={alert.createdAt?.toISOString()}>{formatDateTime(alert.createdAt)}</time>
        </Mono>
        {alert.state === "Open" ? (
          <StatusBadge kind="warning">Open</StatusBadge>
        ) : (
          <StatusBadge kind="neutral">Acknowledged</StatusBadge>
        )}
        {alert.state === "Open" && (
          <Button
            variant="secondary"
            size="small"
            onClick={acknowledge}
            loading={busy}
            loadingLabel="Saving…"
            aria-label={`Acknowledge ${name} alert`}
            aria-describedby={error ? errorId : undefined}
          >
            Acknowledge
          </Button>
        )}
      </Line>
      {error && (
        <Box id={errorId} sx={{ px: space(5), pb: space(3) }}>
          <Notification kind="error">{error}</Notification>
        </Box>
      )}
    </Box>
  );
}

/**
 * The dashboard's view of alerts: the few active ones, each acknowledgeable in one click, and a link to
 * the Alerts page for the rest and the history. Shown above the counts so a mismatch is seen first.
 * `mismatches` is how many parts differ right now: an alert is raised only once a mismatch has lasted, so
 * "no alerts" must not claim that everything matches.
 */
export default function AlertsSummary({ mismatches = 0 }: { mismatches?: number }) {
  const { alerts, openCount, loading, error } = useAlerts();
  const shown = useMemo(() => dashboardAlerts(alerts, DASHBOARD_ALERT_LIMIT), [alerts]);
  const [outcome, setOutcome] = useState("");
  const ready = !loading && !error;
  const calm = ready && shown.length === 0;
  const calmMessage =
    mismatches === 0
      ? "No active alerts. Everything on the shelf matches the POS records."
      : `No active alerts yet. ${formatInteger(mismatches)} ${mismatches === 1 ? "part differs" : "parts differ"} from the POS record (see Stock Check below); a mismatch that lasts is raised here as an alert.`;

  // Nothing active: one row (title, the reassurance, the link), so the space goes to what needs attention.
  if (calm) {
    return (
      <Panel id="alerts" aria-labelledby="alerts-summary-title">
        <VisuallyHidden component="p" role="status" aria-live="polite">
          {describeOpenCount(openCount)}
        </VisuallyHidden>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: space(5), rowGap: space(1), padding: `${space(3)} ${space(5)}` }}>
          <h2 id="alerts-summary-title">Active Alerts</h2>
          <Muted sx={{ flex: "1 1 18rem", fontSize: text.sm }}>{calmMessage}</Muted>
          <Link to="/alerts">View All Alerts</Link>
        </Box>
      </Panel>
    );
  }

  return (
    <Panel id="alerts" tone={openCount > 0 ? "alert" : undefined} aria-labelledby="alerts-summary-title">
      <PanelHeader split>
        <div>
          <h2 id="alerts-summary-title">Active Alerts</h2>
          <Muted>Raised when the camera count differs from the POS record.</Muted>
        </div>
        {openCount > 0 && <StatusBadge kind="warning">{`${openCount} Open`}</StatusBadge>}
      </PanelHeader>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {ready ? describeOpenCount(openCount) : ""}
      </VisuallyHidden>

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
      {outcome && (
        <PanelBody sx={{ pb: 0 }}>
          <Notification kind="success">{outcome}</Notification>
        </PanelBody>
      )}
      {ready && shown.length > 0 && (
        <List aria-label="Active alerts, open ones first">
          {shown.map((alert) => (
            <SummaryItem key={alert.id} alert={alert} onDone={setOutcome} />
          ))}
        </List>
      )}

      <PanelFooter sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: space(3) }}>
        <span>
          {ready && alerts.length > shown.length
            ? `Showing ${formatInteger(shown.length)} of ${formatInteger(alerts.length)} active alerts.`
            : "Past alerts and when they were resolved are on the Alerts page."}
        </span>
        <Link to="/alerts">View All Alerts</Link>
      </PanelFooter>
    </Panel>
  );
}
