import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { theme } from "../theme/theme";
import Notification from "./Notification";

const renderThemed = (ui: ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("Notification", () => {
  it("announces errors as an alert with a spoken Error prefix", () => {
    renderThemed(<Notification kind="error">Scan failed. Try again.</Notification>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Error: Scan failed. Try again.");
    expect(alert).toHaveClass("MuiAlert-colorError");
  });

  it.each([
    ["success", "Success", "✓"],
    ["warning", "Warning", "!"],
    ["info", "Note", "i"],
  ] as const)("announces %s politely as a status", (kind, prefix, icon) => {
    renderThemed(<Notification kind={kind}>Saved.</Notification>);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(`${prefix}: Saved.`);
    expect(screen.getByText(icon)).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to an info status", () => {
    renderThemed(<Notification>Heads up.</Notification>);
    expect(screen.getByRole("status")).toHaveTextContent("Note: Heads up.");
  });

  it("does not announce itself inside an existing live region", () => {
    renderThemed(
      <div aria-live="polite">
        <Notification kind="success" announce={false}>
          Scan complete.
        </Notification>
      </div>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Scan complete.")).toBeInTheDocument();
  });

  it("hides the icon and keeps the message as a paragraph", () => {
    renderThemed(<Notification kind="error">Bad input.</Notification>);
    expect(screen.getByText("!")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Bad input.").tagName).toBe("P");
  });
});
