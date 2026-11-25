import Box from "@mui/material/Box";
import TableScroll from "../../shared/components/TableScroll";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatInteger, formatMoney } from "../../shared/format";
import { color, space, text } from "../../shared/theme/tokens";
import type { SalesBucket } from "./analytics";
import { bucketLabel } from "./chartSupport";

/** The chart's data as a table, in a disclosure: one row per bar, with units per part, value and gross profit. */
export default function SalesDataTable({ buckets, parts }: { buckets: SalesBucket[]; parts: { part: string; name: string }[] }) {
  const weekly = buckets.some((b) => b.days > 1);
  return (
    <Box component="details" sx={{ borderTop: `1px solid ${color.border}`, "& summary": { padding: `${space(3)} ${space(5)}`, cursor: "pointer", fontSize: text.sm } }}>
      <summary>Show the Sales Data as a Table</summary>
      <TableScroll label="Sales data table">
        <DataTable
          caption={`Units, value and gross profit sold per ${weekly ? "week" : "day"} and part, net of customer returns`}
          head={
            <>
              <HeadCell>{weekly ? "Week" : "Day"}</HeadCell>
              {parts.map((p) => (
                <HeadCell key={p.part} numeric>
                  {p.name}
                </HeadCell>
              ))}
              <HeadCell numeric>Total Units</HeadCell>
              <HeadCell numeric>Value</HeadCell>
              <HeadCell numeric>Gross Profit</HeadCell>
            </>
          }
        >
          {buckets.map((b) => (
            <Row key={b.key}>
              <RowHeader mono>{bucketLabel(b)}</RowHeader>
              {parts.map((p) => (
                <NumCell key={p.part}>{formatInteger(b.byPart[p.part]?.units ?? 0)}</NumCell>
              ))}
              <NumCell>{formatInteger(b.total.units)}</NumCell>
              <Cell sx={{ textAlign: "right" }} mono>
                {formatMoney(b.total.value)}
              </Cell>
              <Cell sx={{ textAlign: "right" }} mono>
                {formatMoney(b.total.profit)}
              </Cell>
            </Row>
          ))}
        </DataTable>
      </TableScroll>
    </Box>
  );
}
