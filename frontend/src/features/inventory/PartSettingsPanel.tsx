import { useState } from "react";
import Button from "../../shared/components/Button";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelBody, PanelHeader } from "../../shared/components/Panel";
import TableScroll from "../../shared/components/TableScroll";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { formatInteger, formatMoney } from "../../shared/format";
import { useProducts } from "./hooks";
import PartSettingsDialog from "./PartSettingsDialog";
import { marginPercent } from "./pricing";
import type { Product } from "./types";

const money = (n: number | null) => (n === null ? "Not set" : formatMoney(n));

/** Each part's cost, selling price and reorder settings, with Edit. Shopkeeper only. */
export default function PartSettingsPanel() {
  const products = useProducts();
  const [editing, setEditing] = useState<Product | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const list = products.data ?? [];

  return (
    <Panel aria-labelledby="settings-title">
      <PanelHeader>
        <h2 id="settings-title">Part Settings</h2>
        <Muted>Cost, selling price and when to reorder each part.</Muted>
      </PanelHeader>

      <VisuallyHidden component="p" role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>

      {products.error && (
        <PanelBody>
          <Notification kind="error">{products.error}</Notification>
        </PanelBody>
      )}
      {products.loading && (
        <EmptyState component="p" role="status">
          Loading part settings…
        </EmptyState>
      )}
      {!products.loading && !products.error && list.length === 0 && (
        <EmptyState title="No products yet">Ask your administrator to add a stock record for each part.</EmptyState>
      )}
      {list.length > 0 && !products.error && (
        <TableScroll label="Part settings table">
          <DataTable
            caption="Cost, selling price and reorder settings for each part"
            head={
              <>
                <HeadCell>Part</HeadCell>
                <HeadCell numeric>Unit Cost</HeadCell>
                <HeadCell numeric>Selling Price</HeadCell>
                <HeadCell numeric>Margin</HeadCell>
                <HeadCell numeric>Reorder At</HeadCell>
                <HeadCell numeric>Reorder Qty</HeadCell>
                <HeadCell>Action</HeadCell>
              </>
            }
          >
            {list.map((product) => {
              const margin = marginPercent(product);
              return (
                <Row key={product.id}>
                  <RowHeader translate="no">{product.name}</RowHeader>
                  <NumCell>{money(product.unitCost)}</NumCell>
                  <NumCell>{money(product.unitPrice)}</NumCell>
                  <NumCell>{margin === null ? "—" : `${formatInteger(margin)}%`}</NumCell>
                  <NumCell>{formatInteger(product.reorderLevel)}</NumCell>
                  <NumCell>{product.reorderQty === 0 ? "Off" : formatInteger(product.reorderQty)}</NumCell>
                  <Cell>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setEditing(product)}
                      aria-label={`Edit settings for ${product.name}`}
                    >
                      Edit
                    </Button>
                  </Cell>
                </Row>
              );
            })}
          </DataTable>
        </TableScroll>
      )}

      {editing && (
        <PartSettingsDialog product={editing} onClose={() => setEditing(null)} onSaved={setAnnouncement} />
      )}
    </Panel>
  );
}
