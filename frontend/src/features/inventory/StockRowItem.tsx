import Box from "@mui/material/Box";
import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../../shared/components/Button";
import CompactInput from "../../shared/components/CompactInput";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { Cell, ErrorRow, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatInteger, formatSigned } from "../../shared/format";
import { space } from "../../shared/theme/tokens";
import { useOrders } from "../orders/OrdersContext";
import AdjustStockDialog from "./AdjustStockDialog";
import { receiveStock, recordSale } from "./stockActions";
import { stockErrorMessage } from "./stockErrors";
import type { StockRow, StockState } from "./types";
import { parseReceiveQty } from "./validation";

const BADGES: Record<StockState, { kind: BadgeKind; label: string }> = {
  matched: { kind: "success", label: "Matched" },
  mismatch: { kind: "warning", label: "Mismatch" },
  unscanned: { kind: "neutral", label: "Not Scanned" },
};

interface Props {
  row: StockRow;
  onChanged: (message: string) => void;
}

export default function StockRowItem({ row, onChanged }: Props) {
  const { product, visual, difference, state } = row;
  const errorId = useId();
  const { orders } = useOrders();
  const [busy, setBusy] = useState<"sale" | "receive" | null>(null);
  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [actionError, setActionError] = useState("");
  const [heldQty, setHeldQty] = useState<number | null>(null); // a Receive Stock waiting for "Receive Anyway"
  const [adjusting, setAdjusting] = useState(false);
  const badge = BADGES[state];
  const message = quantityError || actionError;
  // A dispatched dealer order for this part: its delivery belongs to Mark Received, or it is counted twice.
  const dispatched = orders.find((o) => o.product === product.id && o.state === "Dispatched");

  async function handleSale() {
    setBusy("sale");
    setActionError("");
    setQuantityError("");
    try {
      const next = await recordSale(product.id);
      onChanged(`Recorded a sale of ${product.name}. POS record is now ${formatInteger(next)}.`);
    } catch (error) {
      console.error("Record sale failed", error);
      setActionError(stockErrorMessage(error, product.name));
    } finally {
      setBusy(null);
    }
  }

  async function handleReceive(event: FormEvent) {
    event.preventDefault();
    setActionError("");
    const parsed = parseReceiveQty(quantity);
    if (!parsed.ok) {
      setQuantityError(parsed.error);
      setHeldQty(null);
      return;
    }
    setQuantityError("");
    if (dispatched) {
      setHeldQty(parsed.value);
      return;
    }
    await receive(parsed.value);
  }

  async function receive(qty: number) {
    setHeldQty(null);
    setBusy("receive");
    try {
      const next = await receiveStock(product.id, qty);
      setQuantity("");
      onChanged(`Received ${formatInteger(qty)} of ${product.name}. POS record is now ${formatInteger(next)}.`);
    } catch (error) {
      console.error("Receive stock failed", error);
      setActionError(stockErrorMessage(error, product.name));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Row>
        <RowHeader translate="no">{product.name}</RowHeader>
        <NumCell>{visual === null ? "—" : formatInteger(visual)}</NumCell>
        <NumCell>{formatInteger(product.posCount)}</NumCell>
        <NumCell>{difference === null ? "—" : formatSigned(difference)}</NumCell>
        <Cell>
          <StatusBadge kind={badge.kind}>{badge.label}</StatusBadge>
        </Cell>
        <Cell>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space(3) }}>
            <Button
              variant="secondary"
              size="small"
              onClick={handleSale}
              loading={busy === "sale"}
              loadingLabel="Saving…"
              disabled={busy !== null || product.posCount === 0}
              aria-label={`Record sale of ${product.name}`}
            >
              Record Sale
            </Button>
            <Box
              component="form"
              onSubmit={handleReceive}
              noValidate
              sx={{ display: "flex", alignItems: "center", gap: space(2) }}
            >
              <CompactInput
                name="quantity"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="Qty…"
                aria-label={`Quantity to receive for ${product.name}`}
                invalid={Boolean(quantityError)}
                aria-describedby={message || heldQty !== null ? errorId : undefined}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setHeldQty(null);
                }}
                disabled={busy !== null}
              />
              <Button
                type="submit"
                variant="secondary"
                size="small"
                loading={busy === "receive"}
                loadingLabel="Saving…"
                disabled={busy !== null}
                aria-label={`Receive stock for ${product.name}`}
              >
                Receive Stock
              </Button>
            </Box>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setAdjusting(true)}
              disabled={busy !== null}
              aria-label={`Adjust stock for ${product.name}`}
            >
              Adjust
            </Button>
          </Box>
        </Cell>
      </Row>
      {message && (
        <ErrorRow id={errorId} colSpan={6}>
          <Notification kind="error">{message}</Notification>
        </ErrorRow>
      )}
      {!message && heldQty !== null && dispatched && (
        <ErrorRow id={errorId} colSpan={6}>
          <Notification kind="warning">
            A dealer order of {formatInteger(dispatched.qty)} {product.name} has been dispatched. If this delivery is
            that order, use Mark Received on the <Link to="/orders">Orders page</Link> instead, so it is counted once.
          </Notification>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: space(3), padding: `${space(2)} ${space(4)} ${space(3)}` }}>
            <Button variant="secondary" size="small" onClick={() => receive(heldQty)}>
              {`Receive ${formatInteger(heldQty)} Anyway`}
            </Button>
            <Button variant="ghost" size="small" onClick={() => setHeldQty(null)}>
              Cancel
            </Button>
          </Box>
        </ErrorRow>
      )}
      {adjusting && (
        <AdjustStockDialog
          product={product}
          shelfCount={visual}
          onClose={() => setAdjusting(false)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}
