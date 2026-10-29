import Notification from "../../shared/components/Notification";
import TableScroll from "../../shared/components/TableScroll";
import { formatDateTime, formatInteger } from "../../shared/format";
import { partLabel } from "./parts";
import { partKeys } from "./parsers";

export default function ScanHistoryTable({ scans, loading, error }) {
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
          <table className="table">
            <caption className="visually-hidden">The last {scans.length} scans, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Scanned At</th>
                {columns.map((part) => (
                  <th key={part} scope="col" className="num" translate="no">
                    {partLabel(part)}
                  </th>
                ))}
                <th scope="col" className="num">Inference (ms)</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <th scope="row" className="mono">{formatDateTime(scan.scannedAt)}</th>
                  {columns.map((part) => (
                    <td key={part} className="num">{formatInteger(scan.counts[part] ?? 0)}</td>
                  ))}
                  <td className="num">{formatInteger(scan.inferenceMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </section>
  );
}
