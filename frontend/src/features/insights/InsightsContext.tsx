import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSubscription, type Subscribe } from "../../shared/hooks/useSubscription";
import { windowStart } from "./analytics";
import { subscribeMovementsSince, subscribeOrdersSince } from "./insightsRepository";
import type { Movement, OrderTiming } from "./types";

const LOAD_ERROR = "Insights could not be loaded. Check your connection and sign in again if this continues.";

export interface InsightsData {
  movements: Movement[];
  orders: OrderTiming[];
  loadedFrom: Date; // the start of the loaded window
  loading: boolean;
  error: string;
}

const InsightsContext = createContext<InsightsData | null>(null);
const subscribeNone = () => () => {};

/**
 * One pair of live listeners (stock changes and orders over the loaded window) shared by the
 * dashboard tiles and the Insights page, so opening Insights costs no extra reads. Roles that do
 * not see stock (the dealer) pass enabled={false} and never subscribe. The window is fixed when the
 * provider mounts; a session left open past midnight keeps its window, which only ever grows stale
 * by a day at the far end.
 */
export function InsightsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [loadedFrom] = useState(() => windowStart(new Date()));
  const subscribeMovements = useMemo<Subscribe<Movement[]>>(
    () => (enabled ? (onData, onError) => subscribeMovementsSince(loadedFrom, onData, onError) : subscribeNone),
    [enabled, loadedFrom],
  );
  const subscribeOrders = useMemo<Subscribe<OrderTiming[]>>(
    () => (enabled ? (onData, onError) => subscribeOrdersSince(loadedFrom, onData, onError) : subscribeNone),
    [enabled, loadedFrom],
  );
  const movements = useSubscription(subscribeMovements, LOAD_ERROR);
  const orders = useSubscription(subscribeOrders, LOAD_ERROR);

  const value = useMemo<InsightsData>(
    () => ({
      movements: movements.data ?? [],
      orders: orders.data ?? [],
      loadedFrom,
      loading: movements.loading || orders.loading,
      error: movements.error || orders.error,
    }),
    [movements.data, movements.loading, movements.error, orders.data, orders.loading, orders.error, loadedFrom],
  );
  return <InsightsContext.Provider value={value}>{children}</InsightsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInsightsData(): InsightsData {
  const ctx = useContext(InsightsContext);
  if (!ctx) throw new Error("useInsightsData must be used inside <InsightsProvider>");
  return ctx;
}
