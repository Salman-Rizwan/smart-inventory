import { useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import { formatInteger } from "../../shared/format";
import { partLabel } from "./parts";
import { runScan, scanErrorMessage } from "./scanApi";

function summary(result) {
  const parts = Object.entries(result.counts).map(([part, n]) => `${formatInteger(n)} ${partLabel(part)}`);
  return `Scan complete: ${parts.join(", ") || "no parts found"} (${formatInteger(result.inferenceMs)} ms).`;
}

export default function ScanControl() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleScan() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await runScan());
    } catch (err) {
      console.error("Scan failed", err);
      setError(scanErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scan-control">
      <Button onClick={handleScan} loading={busy} loadingLabel="Scanning…">
        Scan Now
      </Button>
      <div className="scan-control__message" aria-live="polite">
        {result && <Notification kind="success" announce={false}>{summary(result)}</Notification>}
      </div>
      {error && <Notification kind="error">{error}</Notification>}
    </div>
  );
}
