import Notification from "../../shared/components/Notification";
import TableScroll from "../../shared/components/TableScroll";
import { DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatDateTime, formatInteger } from "../../shared/format";
import { partLabel } from "./parts";
import { partKeys } from "./parsers";

export interface Scan {
  id: string;
  counts: Record<string, number>;
  scannedAt: Date | null;
  inferenceMs: number | null;
}

interface Props {
  scans: Scan[];
  loading: boolean;
  error: string;
}

/** The most recent scans, newest first: one column per part seen in any of them. */
export default function ScanHistoryTable({ scans, loading, error }: Props) {
  const columns = partKeys(...(scans ?? []).map((s) => s.counts));

  return (
    <section className="panel" aria-labelledby="history-title">
      <div className="panel__header">
        <h2 id="history-title">Recent Scans</h2>
      </div>
      {error && (
        <div className="panel__body">
          <Notification kind="error">{error}</Notification>
        </div>
      )}
      {loading && (
        <p className="empty-state" role="status">
          Loading scans…
        </p>
      )}
      {!loading && !error && scans.length === 0 && (
        <div className="empty-state">
          <strong>No scans yet</strong>
          Each scan you run is listed here, newest first.
        </div>
      )}
      {!loading && !error && scans.length > 0 && (
        <TableScroll label="Recent scans table">
          <DataTable
            caption={`The last ${scans.length} scans, newest first`}
            head={
              <>
                <HeadCell>Scanned At</HeadCell>
                {columns.map((part) => (
                  <HeadCell key={part} numeric translate="no">
                    {partLabel(part)}
                  </HeadCell>
                ))}
                <HeadCell numeric>Inference (ms)</HeadCell>
              </>
            }
          >
            {scans.map((scan) => (
              <Row key={scan.id}>
                <RowHeader mono>{formatDateTime(scan.scannedAt)}</RowHeader>
                {columns.map((part) => (
                  <NumCell key={part}>{formatInteger(scan.counts[part] ?? 0)}</NumCell>
                ))}
                <NumCell>{formatInteger(scan.inferenceMs)}</NumCell>
              </Row>
            ))}
          </DataTable>
        </TableScroll>
      )}
    </section>
  );
}
