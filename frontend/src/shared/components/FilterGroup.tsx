import { styled } from "@mui/material/styles";
import { breakpoint, color, font, space, text } from "../theme/tokens";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string; // names the group for screen readers, e.g. "Filter orders"
  options: readonly FilterOption<T>[];
  value: T;
  counts: Record<T, string>; // already formatted, e.g. "3" or "50+"
  onChange: (value: T) => void;
}

const Group = styled("div", { shouldForwardProp: (prop) => prop !== "grid" })<{ grid: boolean }>(({ grid }) => ({
  display: "inline-flex",
  border: `1px solid ${color.borderStrong}`,
  background: color.canvas,
  // On a phone, four or more filters do not fit in a row: a full-width 2 x 2 grid, hairlines from the gap.
  ...(grid && {
    [`@media (max-width: ${breakpoint.narrow})`]: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 1,
      width: "100%",
      background: color.borderStrong,
      "& > button": { background: color.canvas }, // weaker than the pressed and hover styles, which still apply
      "&& > button": { borderLeft: 0 }, // stronger than the row's divider between buttons
    },
  }),
}));

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

/** A row of toggle buttons that filters a list, each with its count ("Open 3"). */
export default function FilterGroup<T extends string>({ label, options, value, counts, onChange }: Props<T>) {
  return (
    <Group role="group" aria-label={label} grid={options.length > 3}>
      {options.map((option) => (
        <Segment key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          {option.label} <Count>{counts[option.value]}</Count>
        </Segment>
      ))}
    </Group>
  );
}
