import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp, type Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { currentUid } from "../../shared/currentUser";

/** Pause Scanning (settings/scanning). The backend reads pausedUntil before each automatic scan. */
export interface ScanningSettings {
  pausedUntil: Date | null;
}

export const PAUSE_MINUTES = 15; // the rules allow at most 30 minutes ahead, which leaves room for a slow clock

const ref = () => doc(db, "settings", "scanning");

export function parseScanningSettings(data: Record<string, unknown> | undefined): ScanningSettings {
  const until = data?.pausedUntil as { toDate?: () => Date } | null | undefined;
  return { pausedUntil: until && typeof until.toDate === "function" ? until.toDate() : null };
}

export function subscribeScanningSettings(
  onData: (settings: ScanningSettings) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(ref(), (snap) => onData(parseScanningSettings(snap.exists() ? snap.data() : undefined)), onError);
}

/** Pauses automatic scanning for PAUSE_MINUTES; it resumes by itself. Returns when it ends. */
export async function pauseScanning(now: Date = new Date()): Promise<Date> {
  const until = new Date(now.getTime() + PAUSE_MINUTES * 60_000);
  await setDoc(ref(), { pausedUntil: Timestamp.fromDate(until), pausedBy: currentUid(), pausedAt: serverTimestamp() });
  return until;
}

export async function resumeScanning(): Promise<void> {
  await setDoc(ref(), { pausedUntil: null, pausedBy: currentUid(), pausedAt: serverTimestamp() });
}
