import TableScroll from "../../shared/components/TableScroll";
import { Cell, DataTable, HeadCell, NumCell, Row, RowHeader } from "../../shared/components/table";
import { formatInteger, formatMoney } from "../../shared/format";
import { marginOf, rankParts, type PartInsight } from "./analytics";
import { formatShare } from "./insightsText";

/** Which parts earn the money: units, revenue, gross profit and margin, best profit first. */
export default function PartRanking({ parts }: { parts: PartInsight[] }) {
  const ranked = rankParts(parts);
  return (
    <TableScroll label="Sales by part table">
      <DataTable
        caption="Sales by part, best gross profit first"
        head={
          <>
            <HeadCell>Part</HeadCell>
            <HeadCell numeric>Units</HeadCell>
            <HeadCell numeric>Revenue</HeadCell>
            <HeadCell numeric>Gross Profit</HeadCell>
            <HeadCell numeric>Margin</HeadCell>
            <HeadCell numeric>Share of Profit</HeadCell>
          </>
        }
      >
        {ranked.map(({ part, profitShare }) => (
          <Row key={part.part}>
            <RowHeader translate="no">{part.name}</RowHeader>
            <NumCell>{formatInteger(part.sales.units)}</NumCell>
            <Cell sx={{ textAlign: "right" }} mono>
              {formatMoney(part.sales.value)}
            </Cell>
            <Cell sx={{ textAlign: "right" }} mono>
              {part.sales.units !== 0 && part.sales.profitBase === 0 ? "—" : formatMoney(part.sales.profit)}
            </Cell>
            <NumCell>{formatShare(marginOf(part.sales))}</NumCell>
            <NumCell>{formatShare(profitShare)}</NumCell>
          </Row>
        ))}
      </DataTable>
    </TableScroll>
  );
}
