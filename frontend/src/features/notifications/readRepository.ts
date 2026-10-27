import { arrayUnion, doc, onSnapshot, runTransaction, setDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { pruneKeys } from "./readState";

const readDoc = (uid: string) => doc(db, "notification_reads", uid);

/** The keys of the notifications this user has read. A missing or malformed document means none. */
export function parseReadKeys(data: Record<string, unknown> | undefined): string[] {
  const keys = data?.readKeys;
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : [];
}

export function subscribeReadKeys(uid: string, onData: (keys: string[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(readDoc(uid), (snap) => onData(parseReadKeys(snap.exists() ? snap.data() : undefined)), onError);
}

/** Adds keys atomically, so two windows reading at once can never overwrite each other. */
export function markKeysRead(uid: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return Promise.resolve();
  return setDoc(readDoc(uid), { readKeys: arrayUnion(...keys) }, { merge: true });
}

/** Removes keys whose notifications no longer exist. Runs in a transaction because it replaces the list. */
export function pruneReadKeys(uid: string, activeKeys: ReadonlySet<string>): Promise<void> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(readDoc(uid));
    const keys = parseReadKeys(snap.exists() ? snap.data() : undefined);
    const pruned = pruneKeys(keys, activeKeys);
    if (pruned.length < keys.length) tx.set(readDoc(uid), { readKeys: pruned });
  });
}
