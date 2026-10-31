import Box, { type BoxProps } from "@mui/material/Box";
import { color, space, text } from "../theme/tokens";

/*
 * Panel: the white, hairline-bordered surface every dashboard section sits on, with an optional
 * header, body and footer. A <section> by default; pass `component` for a plain container.
 */

type PanelProps = BoxProps & { tone?: "alert" };

export function Panel({ tone, component = "section", sx, ...rest }: PanelProps) {
  return (
    <Box
      component={component}
      sx={[
        { background: color.canvas, border: `1px solid ${color.border}` },
        tone === "alert" && { borderLeft: `4px solid ${color.warning}` },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
}

/** Title row. `split` puts a badge or control at the right, wrapping under the title when narrow. */
export function PanelHeader({ split = false, sx, ...rest }: BoxProps & { split?: boolean }) {
  return (
    <Box
      sx={[
        {
          padding: `${space(4)} ${space(5)}`,
          borderBottom: `1px solid ${color.border}`,
          "& p": { fontSize: text.sm },
        },
        split && { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space(3) },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
}

export function PanelBody({ sx, ...rest }: BoxProps) {
  return <Box sx={[{ padding: space(5) }, ...(Array.isArray(sx) ? sx : [sx])]} {...rest} />;
}

export function PanelFooter({ sx, ...rest }: BoxProps) {
  return (
    <Box
      sx={[
        { padding: `${space(3)} ${space(5)}`, borderTop: `1px solid ${color.border}`, fontSize: text.sm, color: color.inkMuted },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
}
