import Box, { type BoxProps } from "@mui/material/Box";
import { space } from "../theme/tokens";

/** A page's sections, stacked with even gaps. */
export function Page({ sx, ...rest }: BoxProps) {
  return <Box sx={[{ display: "flex", flexDirection: "column", gap: space(5) }, ...(Array.isArray(sx) ? sx : [sx])]} {...rest} />;
}

/** The title block with the page's main action at the right; the action wraps underneath when narrow. */
export function PageHead({ sx, ...rest }: BoxProps) {
  return (
    <Box
      sx={[
        { display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: space(4) },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
}
