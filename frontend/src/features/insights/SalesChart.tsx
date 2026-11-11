import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { BarChart } from "@mui/x-charts/BarChart";
import TableScroll from "../../shared/components/TableScroll";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatInteger, formatMoney } from "../../shared/format";
import { breakpoint, color, space, text } from "../../shared/theme/tokens";
import type { DaySales, PartInsight } from "./analytics";
import { CHART_HEIGHT, dayLabel, fullDayLabel, labelEvery, seriesColor } from "./chartSupport";

interface Props {
  byDay: DaySales[];
  parts: PartInsight[];
  periodDays: number;
}

/** Units sold per day, one stacked column per day and one series per part, with the same data as a table. */
export default function SalesChart({ byDay, parts, periodDays }: Props) {
  const narrow = useMediaQuery(`(max-width: ${breakpoint.narrow})`);
  const every = labelEvery(periodDays, narrow);
  const dates = byDay.map((d) => d.date);
  const series = parts.map((part, index) => ({
    id: part.part,
    label: part.name,
    data: byDay.map((d) => d.byPart[part.part]?.units ?? 0),
    stack: "units",
    color: seriesColor(index),
    valueFormatter: (value: number | null) => (value === null ? "" : `${formatInteger(value)} ${Math.abs(value) === 1 ? "unit" : "units"}`),
  }));
  const summary = `Units sold per day for ${parts.map((p) => p.name).join(" and ")} over the last ${periodDays} days`;

  return (
    <>
      <Box role="img" aria-label={summary} sx={{ px: space(3), "& text": { fontFamily: "inherit", fill: color.inkMuted } }}>
        <BarChart
          height={CHART_HEIGHT}
          series={series}
          xAxis={[
            {
              scaleType: "band",
              data: dates,
              valueFormatter: (date: Date, context) => (context.location === "tick" ? dayLabel(date, periodDays) : fullDayLabel(date)),
              tickLabelInterval: (_value: Date, index: number) => index % every === 0,
              categoryGapRatio: 0.4,
            },
          ]}
          yAxis={[{ tickMinStep: 1, label: "Units" }]}
          grid={{ horizontal: true }}
          borderRadius={2}
          margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
          slotProps={{ legend: { position: { vertical: "bottom", horizontal: "center" } } }}
          sx={{ "& .MuiChartsGrid-line": { stroke: color.border }, "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: color.borderStrong } }}
        />
      </Box>
      <Box component="details" sx={{ borderTop: `1px solid ${color.border}`, "& summary": { padding: `${space(3)} ${space(5)}`, cursor: "pointer", fontSize: text.sm } }}>
        <summary>Show the Sales Data as a Table</summary>
        <TableScroll label="Sales by day table">
          <DataTable
            caption="Units and value sold per day and part, net of customer returns"
            head={
              <>
                <HeadCell>Day</HeadCell>
                {parts.map((p) => (
                  <HeadCell key={p.part} numeric>
                    {p.name}
                  </HeadCell>
                ))}
                <HeadCell numeric>Total Units</HeadCell>
                <HeadCell numeric>Value</HeadCell>
              </>
            }
          >
            {byDay.map((d) => (
              <Row key={d.day}>
                <RowHeader mono>{fullDayLabel(d.date)}</RowHeader>
                {parts.map((p) => (
                  <NumCell key={p.part}>{formatInteger(d.byPart[p.part]?.units ?? 0)}</NumCell>
                ))}
                <NumCell>{formatInteger(d.total.units)}</NumCell>
                <Cell sx={{ textAlign: "right" }} mono>
                  {formatMoney(d.total.value)}
                </Cell>
              </Row>
            ))}
          </DataTable>
        </TableScroll>
      </Box>
    </>
  );
}
