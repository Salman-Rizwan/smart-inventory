import Box, { type BoxProps } from "@mui/material/Box";
import type { ReactNode } from "react";
import { color, space } from "../theme/tokens";

interface EmptyStateProps extends Omit<BoxProps, "title"> {
  /** Bold first line, e.g. "No scans yet". Omit for a one-line message such as "Loading…". */
  title?: ReactNode;
  /** Less padding, for a panel that should stay short when empty. */
  compact?: boolean;
}

/** Centred message for a section with nothing to show yet: loading, empty, or what to do next. */
export default function EmptyState({ title, compact = false, children, sx, ...rest }: EmptyStateProps) {
  return (
    <Box
      sx={[
        {
          padding: compact ? `${space(4)} ${space(5)}` : `${space(6)} ${space(5)}`,
          textAlign: "center",
          color: color.inkMuted,
          "& strong": { display: "block", marginBottom: space(1), color: color.ink, fontWeight: 600 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {title && <strong>{title}</strong>}
      {children}
    </Box>
  );
}
