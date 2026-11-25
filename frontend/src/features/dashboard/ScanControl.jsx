import Box from "@mui/material/Box";
import { useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import { formatInteger } from "../../shared/format";
import { breakpoint, space } from "../../shared/theme/tokens";
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: space(3),
        maxWidth: "100%",
        // On a phone the button and its result take the full width.
        [`@media (max-width: ${breakpoint.narrow})`]: {
          alignItems: "stretch",
          width: "100%",
          "& .MuiButton-root": { width: "100%" },
        },
      }}
    >
      <Button onClick={handleScan} loading={busy} loadingLabel="Scanning…">
        Scan Now
      </Button>
      <Box aria-live="polite" sx={{ "&:empty": { display: "none" } }}>
        {result && <Notification kind="success" announce={false}>{summary(result)}</Notification>}
      </Box>
      {error && <Notification kind="error">{error}</Notification>}
    </Box>
  );
}
