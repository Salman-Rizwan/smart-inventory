import { describe, expect, it } from "vitest";
import { theme } from "./theme";

describe("theme keeps the Carbon-style look", () => {
  it("is square", () => {
    expect(theme.shape.borderRadius).toBe(0);
  });

  it("uses the one teal accent", () => {
    expect(theme.palette.primary.main).toBe("#0e6b6f");
    expect(theme.palette.primary.contrastText).toBe("#ffffff");
  });

  it("uses IBM Plex Sans and sentence-case buttons", () => {
    expect(theme.typography.fontFamily).toMatch(/^"IBM Plex Sans"/);
    expect(theme.typography.button.textTransform).toBe("none");
  });

  it("turns off ripple and elevation", () => {
    expect(theme.components?.MuiButtonBase?.defaultProps?.disableRipple).toBe(true);
    expect(theme.components?.MuiButton?.defaultProps?.disableElevation).toBe(true);
  });

  it("publishes CSS variables for tokens.css to point at", () => {
    expect(theme.vars).toBeDefined();
  });
});
