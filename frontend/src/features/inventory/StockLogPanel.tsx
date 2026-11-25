import Box from "@mui/material/Box";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { partLabel } from "../dashboard/parts";
import { useNow } from "../insights/hooks";
import { useInsightsData } from "../insights/InsightsContext";
import Button from "../../shared/components/Button";
import EmptyState from "../../shared/components/EmptyState";
import FilterGroup, { type FilterOption } from "../../shared/components/FilterGroup";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../shared/components/Panel";
import StatusBadge from "../../shared/components/StatusBadge";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import TableScroll from "../../shared/components/TableScroll";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { formatDateTime, formatInteger, formatSigned } from "../../shared/format";
import { space } from "../../shared/theme/tokens";
import { useProducts } from "./hooks";
import {
  byLabel,
  changeLabel,
  describeLogPeriod,
  filterLog,
  LOG_PAGE_SIZE,
  LOG_PERIOD_LABELS,
  LOG_PERIODS,
  logPeriodStart,
  logSearch,
  parseLogPeriod,
  type LogPeriod,
} from "./stockLog";

const PERIOD_OPTIONS: readonly FilterOption<LogPeriod>[] = LOG_PERIODS.map((p) => ({ value: p, label: LOG_PERIOD_LABELS[p] }));

/**
 * Every change to the POS records in a period, newest first, with who made it (Products, second view).
 * The rows come from the stock changes Insights already keeps live, so this view adds no reads; the
 * table draws 50 rows at a time. The period and part live in the URL (/products/log?part=ID&period=7).
 */
export default function StockLogPanel() {
  const [params, setParams] = useSearchParams();
  const data = useInsightsData();
  const products = useProducts();
  const { user } = useAuth() as { user: { uid: string } | null }; // AuthContext is JavaScript
  const now = useNow();
  const period = parseLogPeriod(params.get("period"));
  const partParam = params.get("part");
  const parts = useMemo(() => products.data ?? [], [products.data]);
  const partFilter = partParam && parts.some((p) => p.id === partParam) ? partParam : "all";
  const part = partFilter === "all" ? null : partFilter;
  const unknownPart = Boolean(partParam) && !products.loading && !products.error && partFilter === "all";
  const loading = data.loading || products.loading;
  const error = data.error || products.error;
  const ready = !loading && !error;
  const nameOf = (id: string) => parts.find((p) => p.id === id)?.name ?? partLabel(id);

  const rows = useMemo(() => filterLog(data.movements, logPeriodStart(now, period), part), [data.movements, now, period, part]);

  // Each filter shows how many changes it holds, so the choice itself informs.
  const periodCounts = useMemo(() => {
    const entries = LOG_PERIODS.map((p) => [p, ready ? formatInteger(filterLog(data.movements, logPeriodStart(now, p), part).length) : ""]);
    return Object.fromEntries(entries) as Record<LogPeriod, string>;
  }, [data.movements, now, part, ready]);
  const partOptions = useMemo<FilterOption<string>[]>(
    () => [{ value: "all", label: "All Parts" }, ...parts.map((p) => ({ value: p.id, label: p.name }))],
    [parts],
  );
  const partCounts = useMemo(() => {
    const start = logPeriodStart(now, period);
    const counts: Record<string, string> = { all: ready ? formatInteger(filterLog(data.movements, start, null).length) : "" };
    for (const p of parts) counts[p.id] = ready ? formatInteger(filterLog(data.movements, start, p.id).length) : "";
    return counts;
  }, [data.movements, now, period, parts, ready]);

  // Built from the URL at that moment, so two quick clicks never lose each other (as on Insights).
  const setFilters = (next: { period?: LogPeriod; part?: string }) =>
    setParams(
      (previous) => {
        const nextPart = next.part ?? previous.get("part") ?? "all";
        return logSearch(next.period ?? parseLogPeriod(previous.get("period")), nextPart === "all" ? null : nextPart);
      },
      { replace: true },
    );

  // Rows drawn so far, per filter: a new period or part starts again at one page.
  const filterKey = `${period}|${partFilter}`;
  const [paging, setPaging] = useState({ key: filterKey, shown: LOG_PAGE_SIZE });
  const shown = paging.key === filterKey ? paging.shown : LOG_PAGE_SIZE;
  const visible = rows.slice(0, shown);
  const hasMore = rows.length > shown;

  // Show More disappears once every row is drawn: put focus on the footer message rather than lose it.
  const footerMessage = useRef<HTMLParagraphElement>(null);
  const pressedShowMore = useRef(false);
  useEffect(() => {
    if (pressedShowMore.current && !hasMore) {
      pressedShowMore.current = false;
      footerMessage.current?.focus();
    }
  }, [hasMore]);

  const scope = `${describeLogPeriod(period)}${part ? ` for ${nameOf(part)}` : ""}`;
  const includesDemo = visible.some((m) => m.seeded);

  return (
    <Panel aria-labelledby="log-title">
      <PanelHeader split>
        <div>
          <h2 id="log-title">Stock Log</h2>
          <Muted>Every change to the POS records: sales, deliveries, received orders and adjustments, with who made it.</Muted>
        </div>
        {includesDemo && <StatusBadge kind="info">Includes demo data</StatusBadge>}
      </PanelHeader>
      <PanelBody sx={{ display: "flex", flexWrap: "wrap", gap: space(3), alignItems: "center" }}>
        <FilterGroup label="Period" options={PERIOD_OPTIONS} value={period} counts={periodCounts} onChange={(v) => setFilters({ period: v })} />
        {parts.length > 1 && (
          <FilterGroup label="Part" options={partOptions} value={partFilter} counts={partCounts} onChange={(v) => setFilters({ part: v })} />
        )}
        <VisuallyHidden component="p">Filter counts are the number of stock changes.</VisuallyHidden>
      </PanelBody>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {ready ? `${formatInteger(rows.length)} stock ${rows.length === 1 ? "change" : "changes"} ${scope}.` : ""}
      </VisuallyHidden>

      {unknownPart && (
        <PanelBody>
          <Notification kind="info">That part is not in the stock records. Showing all parts.</Notification>
        </PanelBody>
      )}
      {error && (
        <PanelBody>
          <Notification kind="error">
            The stock log could not be loaded. Check your connection and refresh the page; sign in again if this continues.
          </Notification>
        </PanelBody>
      )}
      {loading && !error && (
        <EmptyState component="p" role="status">
          Loading the stock log…
        </EmptyState>
      )}
      {ready && rows.length === 0 && (
        <EmptyState title={`No stock changes ${scope}`}>
          {period === "90"
            ? "Sales, deliveries and adjustments appear here as they are recorded."
            : "Sales, deliveries and adjustments appear here as they are recorded. Choose a longer period to see older changes."}
        </EmptyState>
      )}
      {ready && rows.length > 0 && (
        <TableScroll label="Stock log table">
          <DataTable
            caption={`Stock changes ${scope}, newest first`}
            head={
              <>
                <HeadCell>When</HeadCell>
                <HeadCell>Part</HeadCell>
                <HeadCell>Change</HeadCell>
                <HeadCell numeric>Units</HeadCell>
                <HeadCell numeric>POS Before</HeadCell>
                <HeadCell numeric>POS After</HeadCell>
                <HeadCell>By</HeadCell>
              </>
            }
          >
            {visible.map((m) => (
              <Row key={m.id}>
                <RowHeader mono>
                  <time dateTime={m.at.toISOString()}>{formatDateTime(m.at)}</time>
                </RowHeader>
                <Cell translate="no">{nameOf(m.product)}</Cell>
                <Cell>{changeLabel(m)}</Cell>
                <NumCell>{formatSigned(m.change)}</NumCell>
                <NumCell>{formatInteger(m.posBefore)}</NumCell>
                <NumCell>{formatInteger(m.posAfter)}</NumCell>
                <Cell>{byLabel(m, user?.uid ?? null)}</Cell>
              </Row>
            ))}
          </DataTable>
        </TableScroll>
      )}
      {ready && rows.length > 0 && (
        <PanelFooter sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space(3) }}>
          <Box component="p" ref={footerMessage} tabIndex={-1} role="status">
            {hasMore
              ? `Showing the newest ${formatInteger(visible.length)} of ${formatInteger(rows.length)} changes.`
              : `All ${formatInteger(rows.length)} ${rows.length === 1 ? "change" : "changes"} shown.`}
          </Box>
          {hasMore && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                pressedShowMore.current = true;
                setPaging({ key: filterKey, shown: shown + LOG_PAGE_SIZE });
              }}
            >
              Show More Changes
            </Button>
          )}
        </PanelFooter>
      )}
    </Panel>
  );
}

