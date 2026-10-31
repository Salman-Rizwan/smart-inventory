import { styled } from "@mui/material/styles";
import { formatInteger } from "../../shared/format";
import { color, font, space, text } from "../../shared/theme/tokens";
import { FILTERS, type OrderFilter } from "./orderWorkflow";

interface Props {
  value: OrderFilter;
  counts: Record<OrderFilter, number>;
  onChange: (filter: OrderFilter) => void;
}

const Group = styled("div")({
  display: "inline-flex",
  border: `1px solid ${color.borderStrong}`,
  background: color.canvas,
});

/** A toggle button: the pressed one (aria-pressed) is filled teal. */
const Segment = styled("button")({
  minHeight: 36,
  padding: `0 ${space(4)}`,
  border: 0,
  background: "transparent",
  color: color.ink,
  font: "inherit",
  fontSize: text.sm,
  cursor: "pointer",
  touchAction: "manipulation",
  "& + &": { borderLeft: `1px solid ${color.borderStrong}` },
  "&:hover": { background: color.surfaceStrong },
  '&[aria-pressed="true"]': { background: color.accent, color: color.onAccent },
  "@media (pointer: coarse)": { minHeight: 44 },
});

const Count = styled("span")({ marginLeft: space(1), fontFamily: font.mono });

export default function OrderFilterGroup({ value, counts, onChange }: Props) {
  return (
    <Group role="group" aria-label="Filter orders">
      {FILTERS.map((filter) => (
        <Segment key={filter.value} type="button" aria-pressed={value === filter.value} onClick={() => onChange(filter.value)}>
          {filter.label} <Count>{formatInteger(counts[filter.value])}</Count>
        </Segment>
      ))}
    </Group>
  );
}
