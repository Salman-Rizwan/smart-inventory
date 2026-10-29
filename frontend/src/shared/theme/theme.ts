import { createTheme } from "@mui/material/styles";

/*
 * MUI theme: the Carbon-style look (flat, square, hairline borders, one teal accent, IBM Plex).
 * MUI-1 trial scope: palette, type and the Button overrides only. MUI-2 extends this and points
 * tokens.css at the theme's CSS variables, so the two never disagree.
 * Values match tokens.css; colour pairs are the WCAG AA pairs checked there.
 */
const accent = { main: "#0e6b6f", hover: "#0a5558", active: "#073f42", tint: "#e0f2f1" };
const ink = { main: "#161616", muted: "#525252" };
const surface = { canvas: "#ffffff", strong: "#e8e8e8" };
const fontSans = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';
const coarse = "@media (pointer: coarse)";

export const theme = createTheme({
  cssVariables: true,
  shape: { borderRadius: 0 },
  palette: {
    primary: { main: accent.main, dark: accent.hover, contrastText: "#ffffff" },
    text: { primary: ink.main, secondary: ink.muted },
    background: { default: surface.canvas, paper: surface.canvas },
  },
  typography: {
    fontFamily: fontSans,
    button: { fontSize: "0.875rem", fontWeight: 400, letterSpacing: "0.02em", textTransform: "none", lineHeight: 1.5 },
  },
  components: {
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": { outline: `2px solid ${accent.main}`, outlineOffset: "2px" },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          gap: "8px",
          minHeight: 40,
          minWidth: 0,
          padding: "0 16px",
          border: "1px solid transparent",
          boxShadow: "none",
          touchAction: "manipulation",
          transition: "background-color 120ms, border-color 120ms, color 120ms",
          [coarse]: { minHeight: 48 },
          "&.Mui-disabled": { background: surface.strong, color: ink.muted, borderColor: "transparent" },
        },
        sizeSmall: { minHeight: 32, padding: "0 12px", fontSize: "0.875rem", [coarse]: { minHeight: 44 } },
        contained: {
          "&:hover": { background: accent.hover, boxShadow: "none" },
          "&:active": { background: accent.active },
        },
        outlined: {
          background: surface.canvas,
          color: accent.main,
          borderColor: accent.main,
          "&:hover": { background: accent.tint, color: accent.hover, borderColor: accent.main },
        },
        text: {
          color: ink.main,
          "&:hover": { background: surface.strong },
        },
      },
    },
  },
});
