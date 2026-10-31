import { styled } from "@mui/material/styles";
import { color, font, space, text } from "../theme/tokens";

export interface SummaryTile {
  label: string;
  value: string; // already formatted
  hint: string;
  attention?: boolean; // holds work waiting for this user: amber top bar instead of teal
}

const Tiles = styled("dl")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: space(4),
  margin: 0,
});

/** A tile: teal top bar, amber when it holds work waiting for this user. */
const Tile = styled("div", { shouldForwardProp: (prop) => prop !== "attention" })<{ attention: boolean }>(({ attention }) => ({
  margin: 0,
  padding: `${space(4)} ${space(5)}`,
  background: color.canvas,
  border: `1px solid ${color.border}`,
  borderTop: `4px solid ${attention ? color.warning : color.accent}`,
  "& dt": { fontSize: text.sm, fontWeight: 600 },
}));

const Value = styled("dd")({ margin: `${space(1)} 0`, fontFamily: font.mono, fontSize: "2rem", lineHeight: 1.2 });
const Hint = styled("dd")({ margin: 0, fontSize: text.sm, color: color.inkMuted });

/** One tile per state, as a description list: label, count, and what the state means. */
export default function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <Tiles>
      {tiles.map((tile) => (
        <Tile key={tile.label} attention={Boolean(tile.attention)}>
          <dt>{tile.label}</dt>
          <Value>{tile.value}</Value>
          <Hint>{tile.hint}</Hint>
        </Tile>
      ))}
    </Tiles>
  );
}
