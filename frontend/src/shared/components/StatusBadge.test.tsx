import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../theme/theme";
import StatusBadge, { type BadgeKind } from "./StatusBadge";

const renderBadge = (kind: BadgeKind, label: string) =>
  render(
    <ThemeProvider theme={theme}>
      <p>
        Status: <StatusBadge kind={kind}>{label}</StatusBadge>
      </p>
    </ThemeProvider>,
  );

describe("StatusBadge", () => {
  it.each([
    ["success", "✓", "Matched", "MuiChip-colorSuccess"],
    ["warning", "!", "Mismatch", "MuiChip-colorWarning"],
    ["error", "✕", "Failed", "MuiChip-colorError"],
    ["info", "i", "Accepted", "MuiChip-colorInfo"],
    ["neutral", "–", "Acknowledged", "MuiChip-colorDefault"],
  ] as const)("shows %s as icon %s plus text", (kind, icon, label, colourClass) => {
    renderBadge(kind, label);
    const text = screen.getByText(label);
    const badge = text.closest(".MuiChip-root");
    expect(badge).toHaveClass(colourClass);
    expect(badge?.textContent).toBe(`${icon}${label}`);
  });

  it("hides the icon from screen readers so only the text is read", () => {
    renderBadge("warning", "Mismatch");
    const icon = screen.getByText("!");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("is inline phrasing content, not a button or a block", () => {
    renderBadge("success", "Matched");
    const badge = screen.getByText("Matched").closest(".MuiChip-root");
    expect(badge?.tagName).toBe("SPAN");
    expect(badge).not.toHaveAttribute("role");
    expect(badge).not.toHaveAttribute("tabindex");
  });
});
