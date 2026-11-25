import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { useId, useState, type FormEvent } from "react";
import Button from "../../shared/components/Button";
import Dialog from "../../shared/components/Dialog";
import Notification from "../../shared/components/Notification";
import { Muted } from "../../shared/components/text";
import { formatInteger } from "../../shared/format";
import { performCancel } from "./orderActions";
import { cancelErrorMessage } from "./orderErrors";
import { CANCEL_REASON_LABELS, CANCEL_REASONS, describeCancelled, orderPartName, shortId } from "./orderWorkflow";
import type { CancelReason, Order } from "./types";

interface Props {
  order: Order;
  onClose: () => void;
  onCancelled: (message: string) => void;
}

/**
 * Cancel Order (shopkeeper, before dispatch): asks for a reason and confirms. The order is kept as
 * Cancelled, never deleted, so the dealer and the history still see it. Render it only while open.
 */
export default function CancelOrderDialog({ order, onClose, onCancelled }: Props) {
  const reasonLabelId = useId();
  const reasonErrorId = useId();
  const [reason, setReason] = useState<CancelReason | "">("");
  const [reasonError, setReasonError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = shortId(order.id);
  const part = orderPartName(order);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    setSaveError("");
    if (!reason) {
      setReasonError("Choose why you are cancelling this order.");
      requestAnimationFrame(() => form.querySelector<HTMLInputElement>('input[name="reason"]')?.focus());
      return;
    }
    setBusy(true);
    try {
      await performCancel(order.id, reason);
      onCancelled(describeCancelled(id, part));
      onClose();
    } catch (error) {
      console.error("Cancel order failed", error);
      setSaveError(cancelErrorMessage(error, id));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      title={`Cancel Order ${id}?`}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep Order
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Cancelling…">
            Cancel Order
          </Button>
        </>
      }
    >
      <Muted>
        {formatInteger(order.qty)} × <span translate="no">{part}</span>, {order.state.toLowerCase()}. The dealer will see
        the order as cancelled. It stays in the order list and cannot be reopened.
      </Muted>

      <FormControl component="fieldset" error={Boolean(reasonError)} disabled={busy}>
        <FormLabel component="legend" id={reasonLabelId}>
          Reason
        </FormLabel>
        <RadioGroup
          name="reason"
          aria-labelledby={reasonLabelId}
          aria-describedby={reasonError ? reasonErrorId : undefined}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value as CancelReason);
            setReasonError("");
          }}
        >
          {CANCEL_REASONS.map((r) => (
            <FormControlLabel key={r} value={r} control={<Radio />} label={CANCEL_REASON_LABELS[r]} />
          ))}
        </RadioGroup>
        {reasonError && <FormHelperText id={reasonErrorId}>{reasonError}</FormHelperText>}
      </FormControl>

      {saveError && <Notification kind="error">{saveError}</Notification>}
    </Dialog>
  );
}
