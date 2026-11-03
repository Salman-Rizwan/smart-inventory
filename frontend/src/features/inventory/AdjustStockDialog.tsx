import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { useId, useState, type FormEvent } from "react";
import Button from "../../shared/components/Button";
import Dialog from "../../shared/components/Dialog";
import FormField from "../../shared/components/FormField";
import Notification from "../../shared/components/Notification";
import { Muted } from "../../shared/components/text";
import { formatInteger, formatMoney } from "../../shared/format";
import { describeChange, reasonsFor, REASON_LABELS, type AdjustmentReason } from "./movements";
import { adjustStock } from "./stockActions";
import { stockErrorMessage } from "./stockErrors";
import type { Product } from "./types";
import { countChange, parseAdjustment } from "./validation";

interface Props {
  product: Product;
  /** The camera's count, offered as the starting value; null before the first scan. */
  shelfCount: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * Adjust Stock: set the POS record to a count the shopkeeper made, with the reason for the difference
 * (a write-off, a find or a customer return). Logged as an Adjustment, never as a sale, so the sales
 * figures stay true. Render it only while open, so each opening starts fresh.
 */
export default function AdjustStockDialog({ product, shelfCount, onClose, onSaved }: Props) {
  const reasonLabelId = useId();
  const reasonErrorId = useId();
  const before = product.posCount;
  const [count, setCount] = useState(shelfCount !== null && shelfCount !== before ? String(shelfCount) : "");
  const [chosen, setChosen] = useState<AdjustmentReason | "">("");
  const [errors, setErrors] = useState<{ count?: string; reason?: string }>({});
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = countChange(count, before);
  const reasons = change === null ? [] : reasonsFor(change);
  // A reason chosen for the other direction no longer applies once the count changes direction.
  const reason = chosen && reasons.includes(chosen) ? chosen : "";
  const writeOff = change !== null && change < 0 && product.unitCost !== null ? -change * product.unitCost : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    setSaveError("");
    const parsed = parseAdjustment({ count, reason }, before);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      requestAnimationFrame(() =>
        form.querySelector<HTMLInputElement>(parsed.errors.count ? 'input[name="count"]' : 'input[name="reason"]')?.focus(),
      );
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const after = await adjustStock(product.id, parsed.target, parsed.reason);
      onSaved(`Adjusted ${product.name}: ${describeChange(before, after)}, ${REASON_LABELS[parsed.reason]}.`);
      onClose();
    } catch (error) {
      console.error("Adjust stock failed", error);
      setSaveError(stockErrorMessage(error, product.name));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      title={`Adjust ${product.name}`}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving…">
            Save Adjustment
          </Button>
        </>
      }
    >
      <Muted>
        Use this when the POS record is wrong: damaged or missing stock, a miscount, or a customer return. Sales
        and deliveries have their own buttons.
      </Muted>
      {shelfCount !== null && (
        <Muted>
          The camera counted {formatInteger(shelfCount)}. Check the shelf yourself first: the camera can miss parts
          facing away. If the camera is wrong, rearrange the shelf instead of adjusting.
        </Muted>
      )}

      <FormField
        label={`Counted Units (POS record now ${formatInteger(before)})`}
        name="count"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={count}
        error={errors.count}
        disabled={busy}
        onChange={(e) => {
          setCount(e.target.value);
          setErrors((current) => ({ ...current, count: undefined }));
        }}
      />

      <p role="status" aria-live="polite">
        {change !== null && change !== 0 ? describeChange(before, before + change) : ""}
        {writeOff !== null && ` · Write-off value ${formatMoney(writeOff)}`}
      </p>

      <FormControl component="fieldset" error={Boolean(errors.reason)} disabled={busy || reasons.length === 0}>
        <FormLabel component="legend" id={reasonLabelId}>
          Reason
        </FormLabel>
        {reasons.length === 0 ? (
          <Muted>Enter a count that differs from the POS record to choose a reason.</Muted>
        ) : (
          <RadioGroup
            name="reason"
            aria-labelledby={reasonLabelId}
            aria-describedby={errors.reason ? reasonErrorId : undefined}
            value={reason}
            onChange={(e) => {
              setChosen(e.target.value as AdjustmentReason);
              setErrors((current) => ({ ...current, reason: undefined }));
            }}
          >
            {reasons.map((r) => (
              <FormControlLabel key={r} value={r} control={<Radio />} label={REASON_LABELS[r]} />
            ))}
          </RadioGroup>
        )}
        {errors.reason && <FormHelperText id={reasonErrorId}>{errors.reason}</FormHelperText>}
      </FormControl>

      {saveError && <Notification kind="error">{saveError}</Notification>}
    </Dialog>
  );
}
