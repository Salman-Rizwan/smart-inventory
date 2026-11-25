import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../theme/theme";
import Avatar from "./Avatar";

describe("Avatar", () => {
  it("shows initials and is hidden from screen readers", () => {
    render(
      <ThemeProvider theme={theme}>
        <Avatar name="Test Shopkeeper" />
      </ThemeProvider>,
    );
    const avatar = screen.getByText("TS");
    expect(avatar.tagName).toBe("SPAN");
    expect(avatar).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to a question mark without a name", () => {
    render(<Avatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
