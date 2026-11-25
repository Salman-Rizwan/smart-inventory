import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Button from "../../shared/components/Button";
import EmptyState from "../../shared/components/EmptyState";
import FilterGroup from "../../shared/components/FilterGroup";
import Notification from "../../shared/components/Notification";
import { Page, PageHead } from "../../shared/components/Page";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../shared/components/Panel";
import SummaryTiles from "../../shared/components/SummaryTiles";
import TableScroll from "../../shared/components/TableScroll";
import { DataTable, HeadCell } from "../../shared/components/table";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { focusElement } from "../../shared/focusSection";
import { formatInteger } from "../../shared/format";
import { space } from "../../shared/theme/tokens";
import AlertRowItem from "./AlertRowItem";
import { useAlerts } from "./AlertsContext";
import {
  ALERT_FILTERS,
  describeOpenCount,
  filterFor,
  historyCount,
  parseAlertFilter,
  selectAlerts,
  usesHistory,
  type AlertFilter,
} from "./alertSummary";
import { useAlertHistory } from "./useAlertHistory";

const EMPTY: Record<AlertFilter, { title: string; hint: string }> = {
  open: { title: "No open alerts", hint: "An alert appears here when a scan finds a part whose count differs from the POS record." },
  acknowledged: {
    title: "No acknowledged alerts",
    hint: "An alert you acknowledge stays here until the shelf and POS counts match again.",
  },
  resolved: { title: "No resolved alerts yet", hint: "An alert moves here automatically once the shelf and POS counts match." },
  all: { title: "No alerts yet", hint: "An alert appears here when a scan finds a part whose count differs from the POS record." },
};

const CAPTIONS: Record<AlertFilter, string> = {
  open: "Open alerts, newest first",
  acknowledged: "Acknowledged alerts, newest first",
  resolved: "Resolved alerts, newest first",
  all: "All alerts: open first, then acknowledged, then resolved",
};

/**
 * The shopkeeper's alert workspace and history: what needs acknowledging now, and every past
 * mismatch with when it was raised, acknowledged and resolved. A notification opens it at its alert
 * (?alert=ID), which is highlighted and focused.
 */
export default function AlertsPage() {
  const active = useAlerts();
  const history = useAlertHistory();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const targetId = params.get("alert");

  const target = useMemo(
    () => (targetId ? (active.alerts.find((a) => a.id === targetId) ?? history.alerts.find((a) => a.id === targetId)) : undefined),
    [targetId, active.alerts, history.alerts],
  );
  // An explicit filter in the URL wins; otherwise show the filter that holds the alert being opened.
  const filter = params.has("status") ? parseAlertFilter(params.get("status")) : target ? filterFor(target.state) : "open";
  const fromHistory = usesHistory(filter);

  const rows = useMemo(() => selectAlerts(active.alerts, history.alerts, filter), [active.alerts, history.alerts, filter]);
  const counts = useMemo(() => {
    const all = selectAlerts(active.alerts, history.alerts, "all").length;
    const resolved = history.alerts.filter((a) => a.state === "Resolved").length;
    return {
      open: formatInteger(active.openCount),
      acknowledged: formatInteger(active.alerts.length - active.openCount),
      // "…" while the history loads; "—" when it could not load (its error shows on the filters that use it).
      resolved: history.error ? "—" : history.loading ? "…" : historyCount(resolved, history.hasMore),
      all: history.error ? "—" : history.loading ? "…" : historyCount(all, history.hasMore),
    };
  }, [active.alerts, active.openCount, history.alerts, history.hasMore, history.loading, history.error]);

  const loading = active.loading || (fromHistory && history.loading);
  const error = active.error || (fromHistory ? history.error : "");
  const ready = !loading && !error;
  const targetMissing = Boolean(targetId) && !target && !active.loading && !history.loading;
  const [outcome, setOutcome] = useState("");

  // Move focus to the opened alert once its row is on the page; again for each new visit (location.key).
  const targetRow = useRef<HTMLTableRowElement>(null);
  const focusedVisit = useRef("");
  useEffect(() => {
    if (!target || !targetRow.current || focusedVisit.current === location.key) return;
    focusedVisit.current = location.key;
    focusElement(targetRow.current, "center");
  }, [target, rows, location.key]);

  // Load More disappears once everything is loaded: put focus on the footer message rather than lose it.
  const footerMessage = useRef<HTMLParagraphElement>(null);
  const pressedLoadMore = useRef(false);
  useEffect(() => {
    if (pressedLoadMore.current && !history.hasMore) {
      pressedLoadMore.current = false;
      footerMessage.current?.focus();
    }
  }, [history.hasMore]);

  const shownCount = history.alerts.length;

  return (
    <Page>
      <PageHead>
        <div>
          <h1 id="alerts-title" tabIndex={-1}>
            Alerts
          </h1>
          <Muted>
            Raised when the camera count differs from the POS record, and resolved automatically when they match again.
          </Muted>
        </div>
      </PageHead>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {active.loading || active.error ? "" : describeOpenCount(active.openCount)}
      </VisuallyHidden>

      {targetMissing && (
        <Notification kind="info">
          The alert from that notification is no longer listed. Choose All to see every alert.
        </Notification>
      )}

      {outcome && <Notification kind="success">{outcome}</Notification>}

      {!active.loading && !active.error && (
        <SummaryTiles
          tiles={[
            { label: "Open", value: counts.open, hint: "Needs your action", attention: active.openCount > 0 },
            { label: "Acknowledged", value: counts.acknowledged, hint: "Seen: closes when the counts match" },
            { label: "Resolved", value: counts.resolved, hint: "Closed when the counts matched" },
          ]}
        />
      )}

      <Panel aria-labelledby="alerts-list-title">
        <PanelHeader split>
          <div>
            <h2 id="alerts-list-title">Alert List</h2>
            {fromHistory && <Muted>A resolved alert keeps the last mismatch the camera saw.</Muted>}
          </div>
          <FilterGroup
            label="Filter alerts"
            options={ALERT_FILTERS}
            value={filter}
            counts={counts}
            onChange={(next) => setParams(next === "open" ? {} : { status: next }, { replace: true })}
          />
        </PanelHeader>

        {error && (
          <PanelBody>
            <Notification kind="error">{error}</Notification>
          </PanelBody>
        )}
        {loading && !error && (
          <EmptyState component="p" role="status">
            Loading alerts…
          </EmptyState>
        )}
        {ready && rows.length === 0 && <EmptyState title={EMPTY[filter].title}>{EMPTY[filter].hint}</EmptyState>}
        {ready && rows.length > 0 && (
          <TableScroll label="Alert list table">
            <DataTable
              caption={CAPTIONS[filter]}
              head={
                <>
                  <HeadCell>Part</HeadCell>
                  <HeadCell numeric>On Shelf</HeadCell>
                  <HeadCell numeric>POS Record</HeadCell>
                  <HeadCell>Raised At</HeadCell>
                  <HeadCell>Acknowledged At</HeadCell>
                  <HeadCell>Resolved At</HeadCell>
                  <HeadCell>Status</HeadCell>
                  <HeadCell>Action</HeadCell>
                </>
              }
            >
              {rows.map((alert) => {
                const isTarget = alert.id === targetId;
                return (
                  <AlertRowItem
                    key={alert.id}
                    alert={alert}
                    target={isTarget}
                    ref={isTarget ? targetRow : undefined}
                    onAcknowledged={setOutcome}
                  />
                );
              })}
            </DataTable>
          </TableScroll>
        )}

        {ready && fromHistory && shownCount > 0 && (
          <PanelFooter sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space(3) }}>
            <p ref={footerMessage} tabIndex={-1} role="status">
              {history.hasMore
                ? `The newest ${formatInteger(shownCount)} alerts are loaded.`
                : `All ${formatInteger(shownCount)} alerts are loaded.`}
            </p>
            {history.hasMore && (
              <Button
                variant="secondary"
                size="small"
                loading={history.loadingMore}
                loadingLabel="Loading…"
                onClick={() => {
                  pressedLoadMore.current = true;
                  history.loadMore();
                }}
              >
                Load More Alerts
              </Button>
            )}
          </PanelFooter>
        )}
      </Panel>
    </Page>
  );
}
