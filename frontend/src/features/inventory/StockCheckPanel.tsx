import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../../shared/components/Panel";
import TableScroll from "../../shared/components/TableScroll";
import { DataTable, HeadCell } from "../../shared/components/table";
import StatusBadge from "../../shared/components/StatusBadge";
import { useProducts } from "./hooks";
import { buildStockRows } from "./reconcile";
import StockRowItem from "./StockRowItem";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { formatDateTime } from "../../shared/format";

interface Props {
  counts: Record<string, number> | null;
  /** The live camera count's own loading and error state (status/latest), shown here as the counts live here. */
  countStatus?: { loading: boolean; error: string };
  /** When the camera last counted the shelf; the counts are as of then. */
  countedAt?: Date | null;
}

/** Camera count against the (mock) POS record for every product, with the POS simulation buttons. */
export default function StockCheckPanel({ counts, countedAt = null, countStatus }: Props) {
  const products = useProducts();
  const [announcement, setAnnouncement] = useState("");
  const rows = useMemo(() => buildStockRows(products.data ?? [], counts), [products.data, counts]);

  const scanned = rows.filter((r) => r.state !== "unscanned");
  const mismatches = scanned.filter((r) => r.state === "mismatch").length;
  const showTable = !products.loading && !products.error && rows.length > 0;

  return (
    <Panel aria-labelledby="stock-title">
      <PanelHeader split>
        <div>
          <h2 id="stock-title">Stock Check</h2>
          <Muted>Camera count against the POS record for each part.</Muted>
        </div>
        {scanned.length > 0 &&
          (mismatches === 0 ? (
            <StatusBadge kind="success">All Matched</StatusBadge>
          ) : (
            <StatusBadge kind="warning">{`${mismatches} ${mismatches === 1 ? "Mismatch" : "Mismatches"}`}</StatusBadge>
          ))}
      </PanelHeader>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>

      {products.error && (
        <PanelBody>
          <Notification kind="error">{products.error}</Notification>
        </PanelBody>
      )}
      {countStatus?.error && (
        <PanelBody sx={{ pb: 0 }}>
          <Notification kind="error">{countStatus.error}</Notification>
        </PanelBody>
      )}
      {products.loading && (
        <EmptyState component="p" role="status">
          Loading stock records…
        </EmptyState>
      )}
      {!products.loading && !products.error && rows.length === 0 && (
        <EmptyState title="No products yet">Ask your administrator to add a stock record for each part.</EmptyState>
      )}
      {showTable && (
        <>
          <TableScroll label="Stock check table">
            <DataTable
              caption="Camera count against POS record for each part"
              head={
                <>
                  <HeadCell>Part</HeadCell>
                  <HeadCell numeric>On Shelf</HeadCell>
                  <HeadCell numeric>POS Record</HeadCell>
                  <HeadCell numeric>Difference</HeadCell>
                  <HeadCell>Status</HeadCell>
                  <HeadCell>POS Actions</HeadCell>
                </>
              }
            >
              {rows.map((row) => (
                <StockRowItem key={row.product.id} row={row} onChanged={setAnnouncement} />
              ))}
            </DataTable>
          </TableScroll>
          <PanelFooter component="p">
            {countedAt ? (
              <>
                Shelf counts as of <time dateTime={countedAt.toISOString()}>{formatDateTime(countedAt)}</time>.{" "}
              </>
            ) : (
              !countStatus?.loading && !countStatus?.error && <>No shelf count yet. Press Scan Now to count the shelf. </>
            )}
            Difference is shelf minus POS. A negative number means the records show stock that is not on the
            shelf. Costs, prices and reorder levels are in <Link to="/products">Products</Link>.
          </PanelFooter>
        </>
      )}
    </Panel>
  );
}
