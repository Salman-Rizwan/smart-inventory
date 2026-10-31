import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../firebase";
import { parseAlert } from "./alertParsers";
import type { Alert } from "./types";

const parseAll = (snap: QuerySnapshot): Alert[] =>
  snap.docs.map((d) => parseAlert(d.id, d.data())).filter((a): a is Alert => a !== null);

/** Live Open and Acknowledged alerts. Sorting happens in the UI (a server sort would need an index). */
export function subscribeActiveAlerts(onData: (alerts: Alert[]) => void, onError: (error: unknown) => void): Unsubscribe {
  const active = query(collection(db, "alerts"), where("state", "in", ["Open", "Acknowledged"]));
  return onSnapshot(active, (snap) => onData(parseAll(snap)), onError);
}

export interface AlertHistoryPage {
  alerts: Alert[];
  hasMore: boolean;
  size: number; // the page size this snapshot answers
}

/**
 * The newest `size` alerts in every state, live, for the Alerts page history. One extra document is
 * asked for only to learn whether there are more. Ordered by createdAt alone, so no index is needed.
 *
 * When Load More widens the query, Firestore answers first from its local cache, which holds only the
 * alerts already shown; that answer would wrongly say "all loaded". So until the server has answered
 * once, a cached page that is not full is skipped (metadata changes are listened to, so the server's
 * answer always arrives, even when it changes nothing). Later cached pages (offline) are passed on.
 */
export function subscribeAlertHistory(
  size: number,
  onData: (page: AlertHistoryPage) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const newest = query(collection(db, "alerts"), orderBy("createdAt", "desc"), limit(size + 1));
  let confirmed = false;
  return onSnapshot(
    newest,
    { includeMetadataChanges: true },
    (snap) => {
      const full = snap.size > size;
      if (!snap.metadata.fromCache) confirmed = true;
      else if (!confirmed && !full) return;
      onData({ alerts: parseAll(snap).slice(0, size), hasMore: full, size });
    },
    onError,
  );
}

/** Marks an alert as seen. The rules allow only Open -> Acknowledged, with a server timestamp. */
export function acknowledgeAlert(alertId: string): Promise<void> {
  return updateDoc(doc(db, "alerts", alertId), { state: "Acknowledged", acknowledgedAt: serverTimestamp() });
}
