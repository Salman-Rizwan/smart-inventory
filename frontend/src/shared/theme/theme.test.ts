import { describe, expect, it } from "vitest";
import { theme } from "./theme";
import { color } from "./tokens";

describe("theme keeps the Carbon-style look", () => {
  it("is square and flat", () => {
    expect(theme.shape.borderRadius).toBe(0);
    expect(theme.shadows.every((shadow) => shadow === "none")).toBe(true);
  });

  it("uses a 4px spacing grid", () => {
    expect(theme.spacing(1)).toMatch(/4px/);
  });

  it("uses the one teal accent", () => {
    expect(theme.palette.primary.main).toBe(color.accent);
    expect(theme.palette.primary.contrastText).toBe(color.onAccent);
  });

  it("maps each status to its colour and tint", () => {
    expect(theme.palette.success).toMatchObject({ main: color.success, light: color.successBg });
    expect(theme.palette.error).toMatchObject({ main: color.error, light: color.errorBg });
    expect(theme.palette.warning).toMatchObject({ main: color.warning, light: color.warningBg });
    expect(theme.palette.info).toMatchObject({ main: color.info, light: color.infoBg });
  });

  it("uses IBM Plex Sans and sentence-case buttons", () => {
    expect(theme.typography.fontFamily).toMatch(/^"IBM Plex Sans"/);
    expect(theme.typography.button.textTransform).toBe("none");
  });

  it("turns off ripple and elevation", () => {
    expect(theme.components?.MuiButtonBase?.defaultProps?.disableRipple).toBe(true);
    expect(theme.components?.MuiButton?.defaultProps?.disableElevation).toBe(true);
  });
});
