import { formatInteger } from "../../shared/format";
import { FILTERS, type OrderFilter } from "./orderWorkflow";

interface Props {
  value: OrderFilter;
  counts: Record<OrderFilter, number>;
  onChange: (filter: OrderFilter) => void;
}

export default function OrderFilterGroup({ value, counts, onChange }: Props) {
  return (
    <div className="segmented" role="group" aria-label="Filter orders">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className="segmented__btn"
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}{" "}
          <span className="segmented__count">{formatInteger(counts[filter.value])}</span>
        </button>
      ))}
    </div>
  );
}
