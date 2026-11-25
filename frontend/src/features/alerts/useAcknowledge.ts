import { useState } from "react";
import { acknowledgeAlert } from "./alertRepository";
import { alertErrorMessage } from "./alertErrors";

/** What acknowledging changed, in words the user can act on. */
export const acknowledgedMessage = (partName: string): string =>
  `${partName} alert acknowledged. It closes by itself once the shelf and POS counts match.`;

/**
 * Acknowledges one alert, with a busy flag and a user-facing error, and reports success through
 * `onDone`. Shared by the Alerts page and the dashboard.
 */
export function useAcknowledge(alertId: string, partName: string, onDone?: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function acknowledge() {
    setBusy(true);
    setError("");
    try {
      await acknowledgeAlert(alertId);
      onDone?.(acknowledgedMessage(partName));
    } catch (err) {
      console.error("Acknowledge failed", err);
      setError(alertErrorMessage(err, partName));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, acknowledge };
}
