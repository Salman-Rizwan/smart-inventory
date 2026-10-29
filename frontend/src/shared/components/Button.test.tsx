import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../theme/theme";
import Button from "./Button";

const renderThemed = (ui: ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe("Button", () => {
  it("renders a native button that defaults to type button", () => {
    renderThemed(<Button>Scan Now</Button>);
    const button = screen.getByRole("button", { name: "Scan Now" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("passes type, aria attributes and clicks through", async () => {
    const onClick = vi.fn();
    renderThemed(
      <Button type="submit" aria-label="Record sale of Spark Plug" aria-describedby="err" onClick={onClick}>
        Record Sale
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Record sale of Spark Plug" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("aria-describedby", "err");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each([
    ["primary", "MuiButton-contained"],
    ["secondary", "MuiButton-outlined"],
    ["ghost", "MuiButton-text"],
  ] as const)("maps the %s variant to %s", (variant, muiClass) => {
    renderThemed(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass(muiClass);
  });

  it("supports the small size and full width", () => {
    renderThemed(
      <Button size="small" block>
        Go
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button).toHaveClass("MuiButton-sizeSmall");
    expect(button).toHaveClass("MuiButton-fullWidth");
  });

  it("shows the busy label, is disabled and announces busy while loading", async () => {
    const onClick = vi.fn();
    renderThemed(
      <Button loading loadingLabel="Scanning…" onClick={onClick}>
        Scan Now
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Scanning…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".spinner")).not.toBeNull();
    // MUI also sets pointer-events: none when disabled; click anyway to prove nothing fires.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps its label while loading when no busy label is given", () => {
    renderThemed(<Button loading>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("is disabled without a busy state when disabled", () => {
    renderThemed(<Button disabled>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("has no ripple element", () => {
    renderThemed(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).querySelector(".MuiTouchRipple-root")).toBeNull();
  });
});
