import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { BarChart } from "@mui/x-charts/BarChart";
import { formatInteger } from "../../shared/format";
import { breakpoint, color, space } from "../../shared/theme/tokens";
import type { SalesBucket } from "./analytics";
import { bucketLabel, CHART_HEIGHT, dayLabel, labelEvery, seriesColor } from "./chartSupport";

interface Props {
  buckets: SalesBucket[];
  parts: { part: string; name: string }[];
  periodDays: number;
}

/** Units sold per bar (a day, or a week over 90 days): one stacked column each, one series per part. */
export default function SalesChart({ buckets, parts, periodDays }: Props) {
  const narrow = useMediaQuery(`(max-width: ${breakpoint.narrow})`);
  const every = labelEvery(buckets.length, narrow);
  const weekly = buckets.some((b) => b.days > 1);
  const byStart = new Map(buckets.map((b) => [b.start.getTime(), b]));
  const series = parts.map((part, index) => ({
    id: part.part,
    label: part.name,
    data: buckets.map((b) => b.byPart[part.part]?.units ?? 0),
    stack: "units",
    color: seriesColor(index),
    valueFormatter: (value: number | null) => (value === null ? "" : `${formatInteger(value)} ${Math.abs(value) === 1 ? "unit" : "units"}`),
  }));
  const summary = `Units sold per ${weekly ? "week" : "day"} for ${parts.map((p) => p.name).join(" and ")} over the last ${periodDays} days`;

  return (
    <Box role="img" aria-label={summary} sx={{ px: space(3), "& text": { fontFamily: "inherit", fill: color.inkMuted } }}>
      <BarChart
        height={CHART_HEIGHT}
        series={series}
        xAxis={[
          {
            scaleType: "band",
            data: buckets.map((b) => b.start),
            valueFormatter: (date: Date, context) => {
              if (context.location === "tick") return dayLabel(date, weekly ? 90 : periodDays);
              const bucket = byStart.get(date.getTime());
              return bucket ? bucketLabel(bucket) : "";
            },
            tickLabelInterval: (_value: Date, index: number) => index % every === 0,
            categoryGapRatio: 0.4,
          },
        ]}
        yAxis={[{ tickMinStep: 1, label: weekly ? "Units per week" : "Units" }]}
        grid={{ horizontal: true }}
        borderRadius={2}
        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
        slotProps={{ legend: { position: { vertical: "bottom", horizontal: "center" } } }}
        sx={{ "& .MuiChartsGrid-line": { stroke: color.border }, "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: color.borderStrong } }}
      />
    </Box>
  );
}
