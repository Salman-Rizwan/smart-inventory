import { useCallback, useState } from "react";
import { useSubscription, type Subscribe } from "../../shared/hooks/useSubscription";
import { subscribeAlertHistory, type AlertHistoryPage } from "./alertRepository";
import type { Alert } from "./types";

export const HISTORY_PAGE_SIZE = 50;
const LOAD_ERROR = "Past alerts could not be loaded. Check your connection and refresh the page.";

export interface AlertHistory {
  alerts: Alert[];
  hasMore: boolean;
  loading: boolean; // the first page has not arrived yet
  loadingMore: boolean; // Load More was pressed and the larger page has not arrived yet
  error: string;
  loadMore: () => void;
}

/**
 * Alerts in every state, newest first, a page at a time, for the Alerts page only (the header and
 * dashboard need just the active alerts, which AlertsProvider keeps). Load More widens the same live
 * query, so rows already shown stay current.
 */
export function useAlertHistory(): AlertHistory {
  const [size, setSize] = useState(HISTORY_PAGE_SIZE);
  const subscribe = useCallback<Subscribe<AlertHistoryPage>>(
    (onData, onError) => subscribeAlertHistory(size, onData, onError),
    [size],
  );
  const { data, error, loading } = useSubscription(subscribe, LOAD_ERROR);
  const hasMore = data?.hasMore ?? false;
  const loadingMore = data !== undefined && data.size < size;
  const loadMore = useCallback(() => setSize((s) => s + HISTORY_PAGE_SIZE), []);

  return { alerts: data?.alerts ?? [], hasMore, loading, loadingMore, error, loadMore };
}
