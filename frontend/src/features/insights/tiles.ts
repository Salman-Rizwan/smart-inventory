import type { SummaryTile } from "../../shared/components/SummaryTiles";
import { formatInteger, formatMoney } from "../../shared/format";
import { DEFAULT_PERIOD, type InsightsReport } from "./analytics";
import { coverHint, coverValue, describeChange, formatShare, profitHint, profitValue, salesValueText } from "./insightsText";

/** The Insights page section each tile opens, with the dashboard's period. */
export const insightsLink = (section: string, days = DEFAULT_PERIOD): string => `/insights?period=${days}#${section}`;

/** The four headline figures, pure so the wording is tested without the live data. */
export function tilesFor(report: InsightsReport): SummaryTile[] {
  const days = report.period.days;
  const lowest = report.lowestCover;
  const first = report.parts[0];
  const cover = lowest ?? first;
  return [
    {
      label: "Sales",
      value: salesValueText(report.sales),
      hint: describeChange(report.change, days),
      to: insightsLink("sales", days),
    },
    {
      label: "Gross Profit",
      value: profitValue(report.sales),
      hint: profitHint(report.sales, report.profitChange, days),
      to: insightsLink("sales", days),
    },
    {
      label: "Shrinkage",
      value: formatMoney(report.shrinkage.value),
      hint:
        report.shrinkage.units === 0
          ? "No write-offs in this period"
          : `${formatInteger(report.shrinkage.units)} ${report.shrinkage.units === 1 ? "unit" : "units"} written off, ${formatShare(report.shrinkage.shareOfSales)} of sales`,
      to: insightsLink("shrinkage", days),
    },
    {
      label: "Lowest Days of Cover",
      value: cover ? coverValue(cover.cover) : "No parts",
      hint: !cover ? "Add a product first" : lowest ? `${lowest.name}: ${coverHint(lowest.cover, lowest.reorderLevel)}` : coverHint(cover.cover, cover.reorderLevel),
      attention: lowest?.cover.kind === "cover" && lowest.cover.untilReorder === 0,
      to: insightsLink("cover", days),
    },
  ];
}
