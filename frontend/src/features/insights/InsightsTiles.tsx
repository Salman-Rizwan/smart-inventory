import { Link } from "react-router-dom";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../shared/components/Panel";
import StatusBadge from "../../shared/components/StatusBadge";
import SummaryTiles from "../../shared/components/SummaryTiles";
import { Muted } from "../../shared/components/text";
import { space } from "../../shared/theme/tokens";
import { DEFAULT_PERIOD } from "./analytics";
import { useInsights } from "./hooks";
import { insightsLink, tilesFor } from "./tiles";

/** The dashboard's business summary over the last 30 days; each tile opens its Insights section. */
export default function InsightsTiles({ counts }: { counts: Record<string, number> | null }) {
  const { report, loading, error } = useInsights(DEFAULT_PERIOD, null, counts);

  return (
    <Panel aria-labelledby="insights-tiles-title">
      <PanelHeader split>
        <div>
          <h2 id="insights-tiles-title">Business at a Glance</h2>
          <Muted>The last {DEFAULT_PERIOD} days, from the stock change log and the purchase orders.</Muted>
        </div>
        {report?.includesDemo && <StatusBadge kind="info">Includes demo data</StatusBadge>}
      </PanelHeader>
      {error && (
        <PanelBody>
          <Notification kind="error">{error}</Notification>
        </PanelBody>
      )}
      {loading && !error && (
        <EmptyState component="p" role="status" compact>
          Loading insights…
        </EmptyState>
      )}
      {report && (
        <PanelBody sx={{ p: space(4) }}>
          <SummaryTiles tiles={tilesFor(report)} />
        </PanelBody>
      )}
      <PanelFooter sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: space(3) }}>
        <span>Sales are net of customer returns; shrinkage is damaged and lost or stolen stock at cost.</span>
        <Link to={insightsLink("sales")}>View Insights</Link>
      </PanelFooter>
    </Panel>
  );
}
