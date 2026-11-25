import Box from "@mui/material/Box";
import { BarChart } from "@mui/x-charts/BarChart";
import TableScroll from "../../shared/components/TableScroll";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatInteger, formatMoney } from "../../shared/format";
import { color, space, text } from "../../shared/theme/tokens";
import { REASON_LABELS } from "../inventory/movements";
import { SHRINKAGE_REASONS, type PartInsight, type ShrinkageReport } from "./analytics";
import { seriesColor } from "./chartSupport";

/** Two bars need less height than a daily chart, and keeps each bar thin. */
const SHRINKAGE_HEIGHT = 200;

interface Props {
  shrinkage: ShrinkageReport;
  parts: PartInsight[];
}

/** Units written off by reason, one bar per reason stacked by part, with the same data as a table. */
export default function ShrinkageChart({ shrinkage, parts }: Props) {
  const reasons = [...SHRINKAGE_REASONS];
  const units = (part: string, reason: string) => shrinkage.lines.find((l) => l.part === part && l.reason === reason)?.units ?? 0;
  const series = parts.map((part, index) => ({
    id: part.part,
    label: part.name,
    data: reasons.map((reason) => units(part.part, reason)),
    stack: "units",
    color: seriesColor(index),
    valueFormatter: (value: number | null) => (value === null ? "" : `${formatInteger(value)} ${value === 1 ? "unit" : "units"}`),
  }));
  const summary = `Units written off by reason, ${reasons.map((r) => REASON_LABELS[r]).join(" and ")}, for ${parts.map((p) => p.name).join(" and ")}`;

  return (
    <>
      <Box role="img" aria-label={summary} sx={{ px: space(3), "& text": { fontFamily: "inherit", fill: color.inkMuted } }}>
        <BarChart
          height={SHRINKAGE_HEIGHT}
          layout="horizontal"
          series={series}
          yAxis={[{ scaleType: "band", data: reasons, valueFormatter: (reason: string) => REASON_LABELS[reason as keyof typeof REASON_LABELS], width: 110, categoryGapRatio: 0.7 }]}
          xAxis={[{ tickMinStep: 1, label: "Units" }]}
          grid={{ vertical: true }}
          borderRadius={2}
          margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
          slotProps={{ legend: { position: { vertical: "bottom", horizontal: "center" } } }}
          sx={{ "& .MuiChartsGrid-line": { stroke: color.border }, "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: color.borderStrong } }}
        />
      </Box>
      <Box component="details" sx={{ borderTop: `1px solid ${color.border}`, "& summary": { padding: `${space(3)} ${space(5)}`, cursor: "pointer", fontSize: text.sm } }}>
        <summary>Show the Shrinkage Data as a Table</summary>
        <TableScroll label="Shrinkage table">
          <DataTable
            caption="Units written off and their value at cost, by part and reason"
            head={
              <>
                <HeadCell>Part</HeadCell>
                <HeadCell>Reason</HeadCell>
                <HeadCell numeric>Units</HeadCell>
                <HeadCell numeric>Value at Cost</HeadCell>
              </>
            }
          >
            {shrinkage.lines.map((line) => (
              <Row key={`${line.part}:${line.reason}`}>
                <RowHeader translate="no">{parts.find((p) => p.part === line.part)?.name ?? line.part}</RowHeader>
                <Cell>{REASON_LABELS[line.reason]}</Cell>
                <NumCell>{formatInteger(line.units)}</NumCell>
                <Cell sx={{ textAlign: "right" }} mono>
                  {line.uncosted > 0 ? `${formatMoney(line.value)} (${formatInteger(line.uncosted)} without a cost)` : formatMoney(line.value)}
                </Cell>
              </Row>
            ))}
          </DataTable>
        </TableScroll>
      </Box>
    </>
  );
}
