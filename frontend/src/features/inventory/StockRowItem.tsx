import { useId, useState, type FormEvent } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { formatInteger, formatSigned } from "../../shared/format";
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
      <tr>
        <th scope="row" translate="no">
          {product.name}
        </th>
        <td className="num">{visual === null ? "—" : formatInteger(visual)}</td>
        <td className="num">{formatInteger(product.posCount)}</td>
        <td className="num">{difference === null ? "—" : formatSigned(difference)}</td>
        <td>
          <StatusBadge kind={badge.kind}>{badge.label}</StatusBadge>
        </td>
        <td>
          <div className="stock-actions">
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
            <form className="stock-actions__receive" onSubmit={handleReceive} noValidate>
              <input
                className="input-compact"
                name="quantity"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="Qty…"
                aria-label={`Quantity to receive for ${product.name}`}
                aria-invalid={Boolean(quantityError)}
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
            </form>
          </div>
        </td>
      </tr>
      {message && (
        <tr className="table__error">
          <td colSpan={6} id={errorId}>
            <Notification kind="error">{message}</Notification>
          </td>
        </tr>
      )}
    </>
  );
}
