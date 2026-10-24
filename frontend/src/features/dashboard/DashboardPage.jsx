import { formatDateTime } from "../../shared/format";
import CountsGrid from "./CountsGrid";
import { useLatestStatus, useRecentScans } from "./hooks";
import ScanControl from "./ScanControl";
import ScanHistoryTable from "./ScanHistoryTable";
import SnapshotPanel from "./SnapshotPanel";

const HISTORY_SIZE = 10;

export default function DashboardPage() {
  const status = useLatestStatus();
  const scans = useRecentScans(HISTORY_SIZE);
  const scannedAt = status.data?.scannedAt ?? null;

  return (
    <div className="dashboard">
      <div className="dashboard__head">
        <div>
          <h1>Shelf Overview</h1>
          <p className="muted">
            Last scan:{" "}
            {scannedAt ? <time dateTime={scannedAt.toISOString()}>{formatDateTime(scannedAt)}</time> : "none yet"}
          </p>
        </div>
        <ScanControl />
      </div>

      <section aria-labelledby="counts-title">
        <h2 id="counts-title" className="visually-hidden">Current Counts</h2>
        <CountsGrid status={status.data} loading={status.loading} error={status.error} />
      </section>

      <SnapshotPanel scannedAt={scannedAt} />
      <ScanHistoryTable scans={scans.data ?? []} loading={scans.loading} error={scans.error} />
    </div>
  );
}
