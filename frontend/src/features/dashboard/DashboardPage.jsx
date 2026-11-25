import Box from "@mui/material/Box";
import { useMemo } from "react";
import { Page, PageHead } from "../../shared/components/Page";
import { breakpoint, space } from "../../shared/theme/tokens";
import CameraStatus from "./CameraStatus";
import AlertsSummary from "../alerts/AlertsSummary";
import InsightsTiles from "../insights/InsightsTiles";
import StockCheckPanel from "../inventory/StockCheckPanel";
import { useProducts } from "../inventory/hooks";
import { countMismatches } from "../inventory/reconcile";
import { useLatestStatus, useRecentScans } from "./hooks";
import ScanControl from "./ScanControl";
import ScanHistoryTable from "./ScanHistoryTable";
import SnapshotPanel from "./SnapshotPanel";

const HISTORY_SIZE = 10;

/**
 * The shopkeeper's daily glance, in the order they ask their questions: is anything wrong (alerts), how
 * is the business doing (Business at a Glance), does the shelf match the records (Stock Check, with the
 * camera counts), and what did the camera see (the shelf image beside the latest scans). Costs, prices
 * and reorder settings are on the Products tab.
 */
export default function DashboardPage() {
  const status = useLatestStatus();
  const scans = useRecentScans(HISTORY_SIZE);
  const scannedAt = status.data?.scannedAt ?? null;
  const products = useProducts();
  const counts = status.data?.counts ?? null;
  const mismatches = useMemo(() => countMismatches(products.data ?? [], counts), [products.data, counts]);

  return (
    <Page>
      <PageHead>
        {/* The title block shrinks and its status text wraps, so Scan Now keeps its place at the right. */}
        <Box sx={{ flex: "1 1 20rem", minWidth: 0 }}>
          <h1>Shelf Overview</h1>
          <CameraStatus status={status.data ?? null} loading={status.loading} />
        </Box>
        <ScanControl />
      </PageHead>

      <AlertsSummary mismatches={mismatches} />
      <InsightsTiles counts={counts} />
      <StockCheckPanel counts={counts} countedAt={scannedAt} countStatus={{ loading: status.loading, error: status.error }} />

      {/* What the camera saw: the image and the latest scans side by side where there is room. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: space(5),
          alignItems: "start",
          [`@media (min-width: ${breakpoint.wide})`]: { gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)" },
        }}
      >
        <SnapshotPanel scannedAt={scannedAt} />
        <ScanHistoryTable scans={scans.data ?? []} loading={scans.loading} error={scans.error} />
      </Box>
    </Page>
  );
}
