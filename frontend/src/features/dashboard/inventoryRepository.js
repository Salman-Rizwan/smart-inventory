import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { parseScan, parseStatus } from "./parsers";

/** Live subscriptions to Firestore. Each returns an unsubscribe function. */

export function subscribeLatestStatus(onData, onError) {
  return onSnapshot(
    doc(db, "status", "latest"),
    (snap) => onData(snap.exists() ? parseStatus(snap.data()) : null),
    onError,
  );
}

export function subscribeRecentScans(count, onData, onError) {
  const q = query(collection(db, "scans"), orderBy("scannedAt", "desc"), limit(count));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => parseScan(d.id, d.data()))), onError);
}
