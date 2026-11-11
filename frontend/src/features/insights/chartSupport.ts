import { chart } from "../../shared/theme/tokens";

/** The series colour of the part at `index` in the fixed part order; hues never cycle past the list. */
export const seriesColor = (index: number): string => chart.series[Math.min(index, chart.series.length - 1)];

const shortDay = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" });
const longDay = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** Axis label for a day: weekday and date over a week, "6 Nov" over longer periods. */
export const dayLabel = (date: Date, periodDays: number): string => (periodDays <= 7 ? weekday.format(date) : shortDay.format(date));
export const fullDayLabel = (date: Date): string => longDay.format(date);

/** Which day ticks to label so they never overlap: every day over a week, then every 5th or 15th; twice as sparse on a phone. */
export const labelEvery = (periodDays: number, narrow = false): number => {
  const every = periodDays <= 7 ? 1 : periodDays <= 30 ? 5 : 15;
  return narrow ? every * 2 : every;
};

/** A fixed height that fits the content without a layout jump while the data loads. */
export const CHART_HEIGHT = 280;
