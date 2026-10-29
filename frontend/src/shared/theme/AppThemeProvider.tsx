import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { legacyCssVariables } from "./cssVariables";
import { theme } from "./theme";

const rootVariables = { ":root": legacyCssVariables(theme) };

/** Applies the MUI theme and publishes the CSS variables the stylesheets use. */
export default function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={rootVariables} />
      {children}
    </ThemeProvider>
  );
}
