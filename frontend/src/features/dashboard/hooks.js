import { useCallback, useEffect, useState } from "react";
import { useSubscription } from "../../shared/hooks/useSubscription";
import { fetchLatestSnapshot } from "./scanApi";
import { subscribeLatestStatus, subscribeRecentScans } from "./inventoryRepository";

const LOAD_ERROR = "Live data could not be loaded. Check your connection and sign in again if this continues.";

const subscribeStatus = (onData, onError) => subscribeLatestStatus(onData, onError);

export const useLatestStatus = () => useSubscription(subscribeStatus, LOAD_ERROR);

export function useRecentScans(count) {
  const subscribe = useCallback((onData, onError) => subscribeRecentScans(count, onData, onError), [count]);
  return useSubscription(subscribe, LOAD_ERROR);
}

/**
 * Fetches the annotated image again whenever `version` (the last scan time) changes.
 * The previous image stays on screen while the new one loads, so the panel never flashes.
 */
export function useSnapshot(version) {
  const [result, setResult] = useState({ version: undefined, url: null, status: "loading" });

  useEffect(() => {
    if (version == null) return undefined;
    let cancelled = false;
    let objectUrl = null;
    fetchLatestSnapshot()
      .then((url) => {
        if (cancelled) return url && URL.revokeObjectURL(url);
        objectUrl = url;
        setResult({ version, url, status: url ? "ready" : "empty" });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Snapshot load failed", err);
        setResult({ version, url: null, status: "error" });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [version]);

  if (version == null) return { url: null, status: "empty" };
  if (result.version === version) return result;
  return { url: result.url, status: result.url ? "ready" : "loading" };
}
