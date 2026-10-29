import { useMemo, useState } from "react";
import Notification from "../../shared/components/Notification";
import TableScroll from "../../shared/components/TableScroll";
import StatusBadge from "../../shared/components/StatusBadge";
import { useProducts } from "./hooks";
import { buildStockRows } from "./reconcile";
import StockRowItem from "./StockRowItem";

interface Props {
  counts: Record<string, number> | null;
}

/** Camera count against the (mock) POS record for every product, with the POS simulation buttons. */
export default function StockCheckPanel({ counts }: Props) {
  const products = useProducts();
  const [announcement, setAnnouncement] = useState("");
  const rows = useMemo(() => buildStockRows(products.data ?? [], counts), [products.data, counts]);

  const scanned = rows.filter((r) => r.state !== "unscanned");
  const mismatches = scanned.filter((r) => r.state === "mismatch").length;
  const showTable = !products.loading && !products.error && rows.length > 0;

  return (
    <section className="panel" aria-labelledby="stock-title">
      <div className="panel__header panel__header--split">
        <div>
          <h2 id="stock-title">Stock Check</h2>
          <p className="muted">Camera count against the POS record for each part.</p>
        </div>
        {scanned.length > 0 &&
          (mismatches === 0 ? (
            <StatusBadge kind="success">All Matched</StatusBadge>
          ) : (
            <StatusBadge kind="warning">{`${mismatches} ${mismatches === 1 ? "Mismatch" : "Mismatches"}`}</StatusBadge>
          ))}
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {products.error && (
        <div className="panel__body">
          <Notification kind="error">{products.error}</Notification>
        </div>
      )}
      {products.loading && (
        <p className="empty-state" role="status">
          Loading stock records…
        </p>
      )}
      {!products.loading && !products.error && rows.length === 0 && (
        <div className="empty-state">
          <strong>No products yet</strong>
          Ask your administrator to add a stock record for each part.
        </div>
      )}
      {showTable && (
        <>
          <TableScroll label="Stock check table">
            <table className="table">
              <caption className="visually-hidden">Camera count against POS record for each part</caption>
              <thead>
                <tr>
                  <th scope="col">Part</th>
                  <th scope="col" className="num">On Shelf</th>
                  <th scope="col" className="num">POS Record</th>
                  <th scope="col" className="num">Difference</th>
                  <th scope="col">Status</th>
                  <th scope="col">POS Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <StockRowItem key={row.product.id} row={row} onChanged={setAnnouncement} />
                ))}
              </tbody>
            </table>
          </TableScroll>
          <p className="panel__footer muted">
            Difference is shelf minus POS. A negative number means the records show stock that is not on the
            shelf.
          </p>
        </>
      )}
    </section>
  );
}
