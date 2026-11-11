import { Page, PageHead } from "../../shared/components/Page";
import CameraStatus from "./CameraStatus";
import CountsGrid from "./CountsGrid";
import AlertsSummary from "../alerts/AlertsSummary";
import PartSettingsPanel from "../inventory/PartSettingsPanel";
import StockCheckPanel from "../inventory/StockCheckPanel";
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

  return (
    <Page>
      <PageHead>
        <div>
          <h1>Shelf Overview</h1>
          <CameraStatus status={status.data ?? null} />
        </div>
        <ScanControl />
      </PageHead>

      <AlertsSummary />

      <section aria-labelledby="counts-title">
        <VisuallyHidden component="h2" id="counts-title">
          Current Counts
        </VisuallyHidden>
        <CountsGrid status={status.data} loading={status.loading} error={status.error} />
      </section>

      <StockCheckPanel counts={status.data?.counts ?? null} countedAt={scannedAt} />
      <PartSettingsPanel />

      <SnapshotPanel scannedAt={scannedAt} />
      <ScanHistoryTable scans={scans.data ?? []} loading={scans.loading} error={scans.error} />
    </Page>
  );
}
