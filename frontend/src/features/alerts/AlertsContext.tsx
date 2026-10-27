import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSubscription, type Subscribe } from "../../shared/hooks/useSubscription";
import { subscribeActiveAlerts } from "./alertRepository";
import { countOpen } from "./alertSummary";
import type { Alert } from "./types";

const LOAD_ERROR = "Alerts could not be loaded. Check your connection and sign in again if this continues.";

interface AlertsValue {
  enabled: boolean;
  alerts: Alert[];
  openCount: number;
  loading: boolean;
  error: string;
}

const AlertsContext = createContext<AlertsValue | null>(null);
const subscribeNone: Subscribe<Alert[]> = () => () => {};

/**
 * One live alerts listener shared by the header bell and the dashboard panel. Roles that do not
 * see alerts (the dealer) pass enabled={false} and never subscribe.
 */
export function AlertsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { data, error, loading } = useSubscription(enabled ? subscribeActiveAlerts : subscribeNone, LOAD_ERROR);
  const alerts = useMemo(() => data ?? [], [data]);
  const openCount = countOpen(alerts);

  const value = useMemo(
    () => ({ enabled, alerts, openCount, loading: enabled && loading, error }),
    [enabled, alerts, openCount, loading, error],
  );
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAlerts(): AlertsValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used inside <AlertsProvider>");
  return ctx;
}
