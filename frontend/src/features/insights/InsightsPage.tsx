import Box from "@mui/material/Box";
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import EmptyState from "../../shared/components/EmptyState";
import FilterGroup, { type FilterOption } from "../../shared/components/FilterGroup";
import Notification from "../../shared/components/Notification";
import { Page, PageHead } from "../../shared/components/Page";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../shared/components/Panel";
import StatusBadge from "../../shared/components/StatusBadge";
import SummaryTiles from "../../shared/components/SummaryTiles";
import TableScroll from "../../shared/components/TableScroll";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { focusSection } from "../../shared/focusSection";
import { formatDateTime, formatInteger, formatMoney } from "../../shared/format";
import { color, space, text } from "../../shared/theme/tokens";
import { useLatestStatus } from "../dashboard/hooks";
import { useProducts } from "../inventory/hooks";
import { DEFAULT_PERIOD, MIN_DELIVERIES, MIN_HISTORY_DAYS, parsePeriod, PERIODS, periodRange, salesTotals, type PeriodDays } from "./analytics";
import { useInsights, useNow } from "./hooks";
import { useInsightsData } from "./InsightsContext";
import {
  coverHint,
  coverValue,
  describeChange,
  formatDays,
  formatShare,
  leadHint,
  leadValue,
  recommendationText,
  salesValueText,
  unpricedNote,
} from "./insightsText";
import SalesChart from "./SalesChart";
import ShrinkageChart from "./ShrinkageChart";
import { tilesFor } from "./tiles";

const PERIOD_OPTIONS: readonly FilterOption<`${PeriodDays}`>[] = PERIODS.map((d) => ({ value: `${d}` as const, label: `${d} Days` }));
const SECTIONS = ["sales", "shrinkage", "cover", "recommendations"] as const;

function Section({ id, title, subtitle, children, footer }: { id: string; title: string; subtitle: string; children: React.ReactNode; footer?: string }) {
  return (
    <Panel id={id} aria-labelledby={`${id}-title`}>
      <PanelHeader>
        <h2 id={`${id}-title`} tabIndex={-1}>
          {title}
        </h2>
        <Muted>{subtitle}</Muted>
      </PanelHeader>
      {children}
      {footer && <PanelFooter>{footer}</PanelFooter>}
    </Panel>
  );
}

/**
 * Business intelligence for the shopkeeper over the last 7, 30 or 90 days: sales, shrinkage, days
 * of cover and reorder recommendations, each with its definition and a table behind every chart.
 * The period and part filter live in the URL; a dashboard tile opens the page at its section (#id).
 */
export default function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const days = parsePeriod(params.get("period"));
  const partParam = params.get("part");
  const status = useLatestStatus();
  const counts = status.data?.counts ?? null;
  const data = useInsightsData();
  const products = useProducts();
  const now = useNow();
  const { report, loading, error } = useInsights(days, partParam, counts);

  // Filters: each period and part shows the net units sold in it, so the choice itself informs.
  const periodCounts = useMemo(() => {
    const entries = PERIODS.map((d) => {
      const p = periodRange(now, d);
      return [`${d}`, loading || error ? "" : formatInteger(salesTotals(data.movements, p.start, p.end, partParam).units)];
    });
    return Object.fromEntries(entries) as Record<`${PeriodDays}`, string>;
  }, [data.movements, now, partParam, loading, error]);
  // The part filter lists every product, whichever part is chosen.
  const allParts = useMemo(() => (products.data ?? []).map((p) => ({ part: p.id, name: p.name })), [products.data]);
  const partOptions = useMemo<FilterOption<string>[]>(
    () => [{ value: "all", label: "All Parts" }, ...allParts.map((p) => ({ value: p.part, label: p.name }))],
    [allParts],
  );
  const partCounts = useMemo(() => {
    const period = periodRange(now, days);
    const counts: Record<string, string> = { all: loading || error ? "" : formatInteger(salesTotals(data.movements, period.start, period.end).units) };
    for (const p of allParts) counts[p.part] = formatInteger(salesTotals(data.movements, period.start, period.end, p.part).units);
    return counts;
  }, [allParts, data.movements, now, days, loading, error]);
  const partFilterValue = partParam && allParts.some((p) => p.part === partParam) ? partParam : "all";
  const unknownPart = Boolean(partParam) && !loading && !error && partFilterValue === "all";

  // Built from the URL as it is at that moment (not the rendered values), so two quick clicks never
  // lose each other while a navigation is still committing.
  const setFilters = (next: { period?: PeriodDays; part?: string }) =>
    setParams(
      (previous) => {
        const period = next.period ?? parsePeriod(previous.get("period"));
        const part = next.part ?? previous.get("part") ?? "all";
        const fresh: Record<string, string> = {};
        if (period !== DEFAULT_PERIOD) fresh.period = `${period}`;
        if (part !== "all") fresh.part = part;
        return fresh;
      },
      { replace: true },
    );

  // A tile opens its section: once the report is on the page, scroll there and move focus to its heading.
  const focusedVisit = useRef("");
  useEffect(() => {
    const target = location.hash.slice(1);
    if (!report || !SECTIONS.includes(target as (typeof SECTIONS)[number]) || focusedVisit.current === location.key) return;
    focusedVisit.current = location.key;
    focusSection(`${target}-title`);
  }, [report, location.hash, location.key]);

  const ready = Boolean(report) && !loading && !error;
  const nothingYet = ready && report !== null && report.parts.every((p) => p.historyDays === 0);
  const tiles = report ? tilesFor(report) : [];
  const shelfAge = status.data?.scannedAt ? `Shelf counts from the scan at ${formatDateTime(status.data.scannedAt)}.` : "No shelf scan yet.";

  return (
    <Page>
      <PageHead>
        <div>
          <h1 id="insights-title" tabIndex={-1}>
            Insights
          </h1>
          <Muted>
            Sales, shrinkage, days of cover and reorder suggestions from the stock change log and the purchase orders, over the last{" "}
            {days} days.
          </Muted>
        </div>
        {report?.includesDemo && (
          <Box sx={{ pt: space(1) }}>
            <StatusBadge kind="info">Includes demo data</StatusBadge>
          </Box>
        )}
      </PageHead>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: space(3), alignItems: "center" }}>
        <FilterGroup label="Period" options={PERIOD_OPTIONS} value={`${days}`} counts={periodCounts} onChange={(v) => setFilters({ period: parsePeriod(v) })} />
        {allParts.length > 1 && (
          <FilterGroup label="Part" options={partOptions} value={partFilterValue} counts={partCounts} onChange={(v) => setFilters({ part: v })} />
        )}
        <VisuallyHidden component="p">Filter counts are units sold, net of returns.</VisuallyHidden>
      </Box>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {ready ? `Insights for the last ${days} days${partFilterValue === "all" ? "" : ` for ${allParts.find((p) => p.part === partFilterValue)?.name}`} are loaded.` : ""}
      </VisuallyHidden>

      {unknownPart && <Notification kind="info">That part is not in the stock records. Showing all parts.</Notification>}
      {error && <Notification kind="error">{error}</Notification>}
      {loading && !error && (
        <EmptyState component="p" role="status">
          Loading insights…
        </EmptyState>
      )}
      {nothingYet && (
        <EmptyState title="No stock changes yet">
          Record a sale, receive stock or adjust a count on the Dashboard and the figures appear here. For a demo, run seed_history from backend/.
        </EmptyState>
      )}

      {ready && !nothingYet && report && (
        <>
          <SummaryTiles tiles={tiles.map((t) => ({ ...t, to: undefined }))} />

          <Section
            id="sales"
            title="Sales"
            subtitle="Units sold per day and part, net of customer returns, at each sale's own price."
            footer={report.sales.units === 0 ? "No sales in this period." : `${formatInteger(report.sales.units)} units, ${salesValueText(report.sales)} in total. ${describeChange(report.change, days)}. ${unpricedNote(report.sales)}`.trim()}
          >
            <SalesChart byDay={report.byDay} parts={report.parts} periodDays={days} />
          </Section>

          <Section
            id="shrinkage"
            title="Shrinkage"
            subtitle="Stock written off as Damaged or Lost or Stolen, at each entry's own cost. Miscounts, finds and returns are record corrections, not shrinkage."
            footer={
              report.shrinkage.units === 0
                ? "No write-offs in this period."
                : `${formatInteger(report.shrinkage.units)} units, ${formatMoney(report.shrinkage.value)} at cost, ${report.shrinkage.shareOfSales === null ? "no sales value to compare with" : `${formatShare(report.shrinkage.shareOfSales)} of sales`}.${report.shrinkage.uncosted > 0 ? ` ${formatInteger(report.shrinkage.uncosted)} units had no cost: set a cost in Part Settings.` : ""}`
            }
          >
            {report.shrinkage.units === 0 ? (
              <EmptyState compact>Nothing was written off in the last {days} days.</EmptyState>
            ) : (
              <ShrinkageChart shrinkage={report.shrinkage} parts={report.parts} />
            )}
          </Section>

          <Section
            id="cover"
            title="Days of Cover"
            subtitle={`How long the shelf lasts at this period's average daily sales. ${shelfAge}`}
          >
            <TableScroll label="Days of cover table">
              <DataTable
                caption="Days of cover per part: shelf count divided by average daily sales"
                head={
                  <>
                    <HeadCell>Part</HeadCell>
                    <HeadCell numeric>On Shelf</HeadCell>
                    <HeadCell numeric>Sold per Day</HeadCell>
                    <HeadCell numeric>Reorder Level</HeadCell>
                    <HeadCell>Days of Cover</HeadCell>
                  </>
                }
              >
                {report.parts.map((p) => (
                  <Row key={p.part}>
                    <RowHeader translate="no">{p.name}</RowHeader>
                    <NumCell>{p.shelf === null ? "—" : formatInteger(p.shelf)}</NumCell>
                    <NumCell>{formatDays(p.averageDaily)}</NumCell>
                    <NumCell>{formatInteger(p.reorderLevel)}</NumCell>
                    <Cell>
                      <Box component="span" sx={{ display: "block", fontWeight: 600 }}>
                        {coverValue(p.cover)}
                      </Box>
                      <Box component="span" sx={{ fontSize: text.sm, color: color.inkMuted }}>
                        {coverHint(p.cover, p.reorderLevel)}
                      </Box>
                    </Cell>
                  </Row>
                ))}
              </DataTable>
            </TableScroll>
          </Section>

          <Section
            id="recommendations"
            title="Reorder Recommendations"
            subtitle={`Suggested reorder level = average daily sales × the dealer's median lead time, plus a safety margin of half that demand (at least 1 unit), rounded up. Needs ${MIN_HISTORY_DAYS} days of history and ${MIN_DELIVERIES} received deliveries.`}
            footer={`Dealer lead time: ${leadValue(report.lead)}. ${leadHint(report.lead)}.`}
          >
            <TableScroll label="Reorder recommendations table">
              <DataTable
                caption="Suggested reorder level per part next to the current one"
                head={
                  <>
                    <HeadCell>Part</HeadCell>
                    <HeadCell numeric>Sold per Day</HeadCell>
                    <HeadCell numeric>Lead Time (days)</HeadCell>
                    <HeadCell numeric>Current Level</HeadCell>
                    <HeadCell numeric>Suggested Level</HeadCell>
                    <HeadCell>Recommendation</HeadCell>
                  </>
                }
              >
                {report.parts.map((p) => (
                  <Row key={p.part}>
                    <RowHeader translate="no">{p.name}</RowHeader>
                    <NumCell>{formatDays(p.averageDaily)}</NumCell>
                    <NumCell>{report.lead ? formatDays(report.lead.days) : "—"}</NumCell>
                    <NumCell>{formatInteger(p.reorderLevel)}</NumCell>
                    <NumCell>{p.recommendation.kind === "ok" ? formatInteger(p.recommendation.level) : "—"}</NumCell>
                    <Cell>{recommendationText(p.recommendation, p.reorderLevel, MIN_HISTORY_DAYS, MIN_DELIVERIES)}</Cell>
                  </Row>
                ))}
              </DataTable>
            </TableScroll>
            <PanelBody sx={{ pt: 0, fontSize: text.sm, color: color.inkMuted }}>
              A suggestion is applied by hand in Part Settings on the Dashboard; the next scan uses the new level.
            </PanelBody>
          </Section>
        </>
      )}
    </Page>
  );
}
