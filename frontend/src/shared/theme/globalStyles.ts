import { color, font, text } from "./tokens";

/**
 * Page-wide rules, applied once by AppThemeProvider through MUI's GlobalStyles: box sizing, the body
 * font and background, plain headings and paragraphs, links, the keyboard focus ring, and reduced
 * motion. Not MUI's CssBaseline: its defaults (font smoothing, body text size) would change the look.
 */
export const globalStyles = {
  "*, *::before, *::after": { boxSizing: "border-box" },
  html: { WebkitTextSizeAdjust: "100%" },
  body: {
    margin: 0,
    minHeight: "100vh",
    fontFamily: font.sans,
    fontSize: text.md,
    lineHeight: 1.5,
    letterSpacing: "0.01em",
    color: color.ink,
    background: color.surface,
  },
  "h1, h2, h3": { margin: 0, fontWeight: 400, textWrap: "balance" },
  h1: { fontSize: text.xl, lineHeight: 1.25 },
  h2: { fontSize: text.lg, lineHeight: 1.4 },
  p: { margin: 0, textWrap: "pretty" },
  a: { color: color.accent },
  "a:hover": { color: color.accentHover },
  ":focus-visible": { outline: `2px solid ${color.accent}`, outlineOffset: "2px" },
  "@media (prefers-reduced-motion: reduce)": {
    "*, *::before, *::after": {
      animationDuration: "0.01ms !important",
      animationIterationCount: "1 !important",
      transitionDuration: "0.01ms !important",
    },
  },
} as const;
