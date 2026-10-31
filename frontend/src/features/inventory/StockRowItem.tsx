import Box from "@mui/material/Box";
import { useId, useState, type FormEvent } from "react";
import Button from "../../shared/components/Button";
import CompactInput from "../../shared/components/CompactInput";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { Cell, ErrorRow, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatInteger, formatSigned } from "../../shared/format";
import { space } from "../../shared/theme/tokens";
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
  const [busy, setBusy] = useState<"sale" | "receive" | null>(null);
  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [actionError, setActionError] = useState("");
  const badge = BADGES[state];
  const message = quantityError || actionError;

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
      return;
    }
    setQuantityError("");
    setBusy("receive");
    try {
      const next = await receiveStock(product.id, parsed.value);
      setQuantity("");
      onChanged(
        `Received ${formatInteger(parsed.value)} of ${product.name}. POS record is now ${formatInteger(next)}.`,
      );
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
                aria-describedby={message ? errorId : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
          </Box>
        </Cell>
      </Row>
      {message && (
        <ErrorRow id={errorId} colSpan={6}>
          <Notification kind="error">{message}</Notification>
        </ErrorRow>
      )}
    </>
  );
}
