import { useState, type FormEvent } from "react";
import Button from "../../shared/components/Button";
import Dialog from "../../shared/components/Dialog";
import FormField from "../../shared/components/FormField";
import Notification from "../../shared/components/Notification";
import { Muted } from "../../shared/components/text";
import { CURRENCY } from "../../shared/format";
import { savePartSettings } from "./productRepository";
import { stockErrorMessage } from "./stockErrors";
import type { PartSettings, Product } from "./types";
import { parsePartSettings, settingsWarning, type SettingsForm } from "./validation";

interface Props {
  product: Product;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const asText = (n: number | null) => (n === null ? "" : String(n));

const FIELDS: { key: keyof SettingsForm; label: string; mode: "decimal" | "numeric" }[] = [
  { key: "unitCost", label: `Unit Cost (${CURRENCY})`, mode: "decimal" },
  { key: "unitPrice", label: `Selling Price (${CURRENCY})`, mode: "decimal" },
  { key: "reorderLevel", label: "Reorder At (Units on Shelf)", mode: "numeric" },
  { key: "reorderQty", label: "Reorder Quantity (Units)", mode: "numeric" },
];

/**
 * Part Settings: cost and selling price (for the money figures in Insights) and the reorder settings
 * the backend uses for automatic orders. Render it only while open, so each opening starts fresh.
 */
export default function PartSettingsDialog({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState<SettingsForm>({
    unitCost: asText(product.unitCost),
    unitPrice: asText(product.unitPrice),
    reorderLevel: String(product.reorderLevel),
    reorderQty: String(product.reorderQty),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SettingsForm, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = parsePartSettings(form);
  const warning = parsed.ok ? settingsWarning(parsed.value) : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formEl = event.currentTarget;
    setSaveError("");
    if (!parsed.ok) {
      setErrors(parsed.errors);
      const first = FIELDS.find((f) => parsed.errors[f.key]);
      requestAnimationFrame(() => formEl.querySelector<HTMLInputElement>(`input[name="${first?.key}"]`)?.focus());
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await savePartSettings(product.id, parsed.value satisfies PartSettings);
      onSaved(`Saved the settings for ${product.name}.`);
      onClose();
    } catch (error) {
      console.error("Save part settings failed", error);
      setSaveError(stockErrorMessage(error, product.name));
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      title={`${product.name} Settings`}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} loadingLabel="Saving…">
            Save Settings
          </Button>
        </>
      }
    >
      <Muted>
        Cost and price give the money figures in reports; leave them blank until known. An order goes to the dealer
        when the shelf count stays at or below Reorder At.
      </Muted>
      {FIELDS.map((field) => (
        <FormField
          key={field.key}
          label={field.label}
          name={field.key}
          inputMode={field.mode}
          autoComplete="off"
          spellCheck={false}
          value={form[field.key]}
          error={errors[field.key]}
          disabled={busy}
          onChange={(e) => {
            const value = e.target.value;
            setForm((current) => ({ ...current, [field.key]: value }));
            setErrors((current) => ({ ...current, [field.key]: undefined }));
          }}
        />
      ))}
      {warning && <Notification kind="warning">{warning}</Notification>}
      {saveError && <Notification kind="error">{saveError}</Notification>}
    </Dialog>
  );
}
