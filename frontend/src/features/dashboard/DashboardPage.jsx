import Box from "@mui/material/Box";
import { useMemo } from "react";
import { Page, PageHead } from "../../shared/components/Page";
import CameraStatus from "./CameraStatus";
import CountsGrid from "./CountsGrid";
import AlertsSummary from "../alerts/AlertsSummary";
import InsightsTiles from "../insights/InsightsTiles";
import PartSettingsPanel from "../inventory/PartSettingsPanel";
import StockCheckPanel from "../inventory/StockCheckPanel";
import { useProducts } from "../inventory/hooks";
import { countMismatches } from "../inventory/reconcile";
import { useLatestStatus, useRecentScans } from "./hooks";
import ScanControl from "./ScanControl";
import ScanHistoryTable from "./ScanHistoryTable";
import SnapshotPanel from "./SnapshotPanel";
import { VisuallyHidden } from "../../shared/components/text";

const HISTORY_SIZE = 10;

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

      <section aria-labelledby="counts-title">
        <VisuallyHidden component="h2" id="counts-title">
          Current Counts
        </VisuallyHidden>
        <CountsGrid status={status.data} loading={status.loading} error={status.error} />
      </section>

      <StockCheckPanel counts={counts} countedAt={scannedAt} />
      <InsightsTiles counts={counts} />
      <PartSettingsPanel />

      <SnapshotPanel scannedAt={scannedAt} />
      <ScanHistoryTable scans={scans.data ?? []} loading={scans.loading} error={scans.error} />
    </Page>
  );
}
