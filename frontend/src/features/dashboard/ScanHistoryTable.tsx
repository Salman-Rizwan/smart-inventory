import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelHeader } from "../../shared/components/Panel";
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
    <Panel aria-labelledby="history-title">
      <PanelHeader>
        <h2 id="history-title">Recent Scans</h2>
      </PanelHeader>
      {error && (
        <PanelBody>
          <Notification kind="error">{error}</Notification>
        </PanelBody>
      )}
      {loading && (
        <EmptyState component="p" role="status">
          Loading scans…
        </EmptyState>
      )}
      {!loading && !error && scans.length === 0 && (
        <EmptyState title="No scans yet">Each scan you run is listed here, newest first.</EmptyState>
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
    </Panel>
  );
}
