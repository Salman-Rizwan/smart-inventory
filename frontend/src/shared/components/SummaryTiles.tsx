import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { color, font, space, text } from "../theme/tokens";

export interface SummaryTile {
  label: string;
  value: string; // already formatted
  hint: string;
  attention?: boolean; // holds work waiting for this user: amber top bar instead of teal
  to?: string; // where the tile leads (the whole tile becomes clickable; the link sits on the label)
}

const Tiles = styled("dl")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: space(4),
  margin: 0,
});

/** A tile: teal top bar, amber when it holds work waiting for this user. */
const Tile = styled("div", { shouldForwardProp: (prop) => prop !== "attention" })<{ attention: boolean }>(({ attention }) => ({
  position: "relative",
  containerType: "inline-size",
  margin: 0,
  padding: `${space(4)} ${space(5)}`,
  background: color.canvas,
  border: `1px solid ${color.border}`,
  borderTop: `4px solid ${attention ? color.warning : color.accent}`,
  "& dt": { fontSize: text.sm, fontWeight: 600 },
  // A linked tile: the label's link is stretched over the whole tile, and the tile shows the focus ring.
  "& dt a": { color: "inherit", textDecoration: "none" },
  "& dt a::after": { content: '""', position: "absolute", inset: 0 },
  "&:has(dt a:hover)": { background: color.surface },
  "&:has(dt a:focus-visible)": { outline: `2px solid ${color.accent}`, outlineOffset: 2 },
  "& dt a:focus-visible": { outline: "none" },
}));

/**
 * The figure. The tile is a size container, so the figure scales with the tile's own width: a money
 * value such as "LKR 31,800.00" (13 mono characters, joined by a no-break space) always fits on one
 * line and is never split mid-number, whether the tile is a quarter of the dashboard or the full
 * width of a phone. Words ("No deliveries yet") still wrap at spaces.
 */
const Value = styled("dd")({
  margin: `${space(1)} 0`,
  fontFamily: font.mono,
  fontSize: "clamp(1.125rem, 11cqi, 2rem)",
  lineHeight: 1.2,
});
const Hint = styled("dd")({ margin: 0, fontSize: text.sm, color: color.inkMuted });

/** One tile per figure, as a description list: label, value, and what it means. A `to` makes the tile a link. */
export default function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <Tiles>
      {tiles.map((tile) => (
        <Tile key={tile.label} attention={Boolean(tile.attention)}>
          <dt>{tile.to ? <Link to={tile.to}>{tile.label}</Link> : tile.label}</dt>
          <Value>{tile.value}</Value>
          <Hint>{tile.hint}</Hint>
        </Tile>
      ))}
    </Tiles>
  );
}
