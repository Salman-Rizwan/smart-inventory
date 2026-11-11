import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge from "../../shared/components/StatusBadge";
import { Muted, VisuallyHidden } from "../../shared/components/text";
import { useNow } from "../../shared/hooks/useNow";
import { space } from "../../shared/theme/tokens";
import { cameraState, type CameraStateKind, type ScanStatus } from "./cameraState";
import { useScanningSettings } from "./hooks";
import { PAUSE_MINUTES, pauseScanning, resumeScanning } from "./scanningRepository";

const TICK_MS = 15_000;

function pauseErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "signed-out") return "Your session has ended. Sign in again, then try again.";
  if (code === "permission-denied") return "Only a shopkeeper can pause scanning. Sign in as the shopkeeper and try again.";
  return "Scanning could not be paused or resumed. Check your connection and try again.";
}

/**
 * What the camera is doing: live, off, paused, too dark, not responding, or silent (laptop asleep or the
 * backend stopped), with a next step, and Pause Scanning for restocking. Announces a change of state,
 * never every tick and never the first state after loading.
 */
export default function CameraStatus({ status, loading = false }: { status: ScanStatus | null; loading?: boolean }) {
  const now = useNow(TICK_MS);
  const settings = useScanningSettings();
  const checking = loading || settings.loading;
  const pausedUntil = settings.data?.pausedUntil ?? null;
  const state = cameraState(status, now, pausedUntil);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef<CameraStateKind | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  useEffect(() => {
    if (checking) return;
    if (previous.current !== null && previous.current !== state.kind) setAnnouncement(`${state.label}. ${state.detail}`);
    previous.current = state.kind;
  }, [checking, state.kind, state.label, state.detail]);

  // The button is disabled while saving, and a disabled button loses keyboard focus: give it back.
  useEffect(() => {
    if (busy || !refocus.current) return;
    refocus.current = false;
    button.current?.focus();
  }, [busy]);

  async function toggle() {
    refocus.current = document.activeElement === button.current;
    setBusy(true);
    setError("");
    try {
      await (state.kind === "paused" ? resumeScanning() : pauseScanning());
    } catch (err) {
      console.error("Pause or resume failed", err);
      setError(pauseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box component="section" aria-labelledby="camera-title" sx={{ display: "grid", gap: space(2) }}>
      <VisuallyHidden component="h2" id="camera-title">
        Camera Status
      </VisuallyHidden>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space(3) }}>
        {checking ? (
          <StatusBadge kind="neutral">Checking Camera…</StatusBadge>
        ) : (
          <>
            <StatusBadge kind={state.badge}>{state.label}</StatusBadge>
            <Muted component="span">{state.detail}</Muted>
          </>
        )}
        {!checking && status?.autoScan?.enabled && (
          <Button ref={button} variant={state.kind === "paused" ? "secondary" : "ghost"} size="small" onClick={toggle} loading={busy} loadingLabel="Saving…">
            {state.kind === "paused" ? "Resume Scanning" : `Pause Scanning (${PAUSE_MINUTES} Min)`}
          </Button>
        )}
      </Box>
      <VisuallyHidden component="p" role="status" aria-live="polite">
        {announcement}
      </VisuallyHidden>
      {error && <Notification kind="error">{error}</Notification>}
    </Box>
  );
}
