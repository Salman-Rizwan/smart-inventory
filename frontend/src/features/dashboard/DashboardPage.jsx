import { Page, PageHead } from "../../shared/components/Page";
import { formatDateTime } from "../../shared/format";
import CountsGrid from "./CountsGrid";
import AlertsPanel from "../alerts/AlertsPanel";
import StockCheckPanel from "../inventory/StockCheckPanel";
import { useLatestStatus, useRecentScans } from "./hooks";
import ScanControl from "./ScanControl";
import ScanHistoryTable from "./ScanHistoryTable";
import SnapshotPanel from "./SnapshotPanel";
import { Muted, VisuallyHidden } from "../../shared/components/text";

const HISTORY_SIZE = 10;

export default function DashboardPage() {
  const status = useLatestStatus();
  const scans = useRecentScans(HISTORY_SIZE);
  const scannedAt = status.data?.scannedAt ?? null;

  return (
    <Page>
      <PageHead>
        <div>
          <h1>Shelf Overview</h1>
          <Muted>
            Last scan:{" "}
            {scannedAt ? <time dateTime={scannedAt.toISOString()}>{formatDateTime(scannedAt)}</time> : "none yet"}
          </Muted>
        </div>
        <ScanControl />
      </PageHead>

      <AlertsPanel />

      <section aria-labelledby="counts-title">
        <VisuallyHidden component="h2" id="counts-title">
          Current Counts
        </VisuallyHidden>
        <CountsGrid status={status.data} loading={status.loading} error={status.error} />
      </section>

      <StockCheckPanel counts={status.data?.counts ?? null} />

      <SnapshotPanel scannedAt={scannedAt} />
      <ScanHistoryTable scans={scans.data ?? []} loading={scans.loading} error={scans.error} />
    </Page>
  );
}
