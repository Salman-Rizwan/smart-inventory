import Box, { type BoxProps } from "@mui/material/Box";
import { color } from "../theme/tokens";

const hidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/**
 * Text for screen readers only: live status lines, hidden headings and captions, and words that
 * complete an accessible name ("Unread:", "2 need your action"). A <span> unless `component` says otherwise.
 */
export function VisuallyHidden({ component = "span", ...rest }: BoxProps) {
  return <Box component={component} sx={hidden} {...rest} />;
}

/** Secondary text in the muted ink colour: subtitles, hints, "Showing 5 of 9". A <p> by default. */
export function Muted({ component = "p", ...rest }: BoxProps) {
  return <Box component={component} sx={{ color: color.inkMuted }} {...rest} />;
}
