import Box from "@mui/material/Box";
import { Panel } from "../../shared/components/Panel";
import { formatInteger } from "../../shared/format";
import { color, font, space, text } from "../../shared/theme/tokens";
import { partLabel } from "./parts";

export default function PartCountCard({ part, count }) {
  return (
    <Panel
      component="div"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: space(1),
        padding: space(5),
        borderTop: `4px solid ${color.accent}`,
      }}
    >
      <Box component="h3" translate="no" sx={{ fontSize: text.md, fontWeight: 600 }}>
        {partLabel(part)}
      </Box>
      <Box
        component="p"
        sx={{
          margin: `${space(2)} 0`,
          fontFamily: font.mono,
          fontSize: text.display,
          fontWeight: 400,
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatInteger(count)}
      </Box>
      <Box component="p" sx={{ fontSize: text.sm, color: color.inkMuted }}>
        {count === 1 ? "unit" : "units"} on shelf
      </Box>
    </Panel>
  );
}
