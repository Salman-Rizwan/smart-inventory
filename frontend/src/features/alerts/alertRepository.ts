import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, type Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { parseAlert } from "./alertParsers";
import type { Alert } from "./types";

/** Live Open and Acknowledged alerts. Sorting happens in the UI (a server sort would need an index). */
export function subscribeActiveAlerts(onData: (alerts: Alert[]) => void, onError: (error: unknown) => void): Unsubscribe {
  const active = query(collection(db, "alerts"), where("state", "in", ["Open", "Acknowledged"]));
  return onSnapshot(
    active,
    (snap) => onData(snap.docs.map((d) => parseAlert(d.id, d.data())).filter((a): a is Alert => a !== null)),
    onError,
  );
}

/** Marks an alert as seen. The rules allow only Open -> Acknowledged, with a server timestamp. */
export function acknowledgeAlert(alertId: string): Promise<void> {
  return updateDoc(doc(db, "alerts", alertId), { state: "Acknowledged", acknowledgedAt: serverTimestamp() });
}
