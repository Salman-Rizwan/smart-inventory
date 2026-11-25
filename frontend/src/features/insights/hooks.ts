import { useEffect, useMemo, useState } from "react";
import { useProducts } from "../inventory/hooks";
import { computeInsights, type InsightsReport, type PeriodDays } from "./analytics";
import { useInsightsData } from "./InsightsContext";

/** The current time, refreshed every minute so the period rolls over at midnight without a reload. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export interface InsightsView {
  report: InsightsReport | null; // null while loading or on error
  loading: boolean;
  error: string;
  now: Date;
}

/**
 * The report for a period and an optional part, from the shared live data. `counts` is the latest
 * shelf count per part (status/latest), passed in by the page that already listens to it.
 */
export function useInsights(days: PeriodDays, part: string | null, counts: Record<string, number> | null): InsightsView {
  const data = useInsightsData();
  const products = useProducts();
  const now = useNow();
  const loading = data.loading || products.loading;
  const error = data.error || products.error;
  const report = useMemo(
    () =>
      loading || error
        ? null
        : computeInsights({
            movements: data.movements,
            orders: data.orders,
            products: products.data ?? [],
            counts,
            now,
            days,
            loadedFrom: data.loadedFrom,
            part,
          }),
    [loading, error, data.movements, data.orders, data.loadedFrom, products.data, counts, now, days, part],
  );
  return { report, loading, error, now };
}
