import FilterGroup from "../../shared/components/FilterGroup";
import { formatInteger } from "../../shared/format";
import { FILTERS, type OrderFilter } from "./orderWorkflow";

interface Props {
  value: OrderFilter;
  counts: Record<OrderFilter, number>;
  onChange: (filter: OrderFilter) => void;
}

export default function OrderFilterGroup({ value, counts, onChange }: Props) {
  const formatted = { open: formatInteger(counts.open), closed: formatInteger(counts.closed), all: formatInteger(counts.all) };
  return <FilterGroup label="Filter orders" options={FILTERS} value={value} counts={formatted} onChange={onChange} />;
}
