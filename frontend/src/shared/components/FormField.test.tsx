import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { theme } from "../theme/theme";
import FormField from "./FormField";

function Harness({ type = "text", error }: { type?: string; error?: string }) {
  const [value, setValue] = useState("");
  return (
    <ThemeProvider theme={theme}>
      <FormField
        label={type === "password" ? "Password" : "Email"}
        name={type === "password" ? "password" : "email"}
        type={type}
        placeholder="Hint…"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error}
      />
    </ThemeProvider>
  );
}

describe("FormField", () => {
  it("ties the visible label to the input", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("placeholder", "Hint…");
  });

  it("is a controlled field", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Email");
    await userEvent.type(input, "a@b.co");
    expect(input).toHaveValue("a@b.co");
  });

  it("links the error text and marks the input invalid", () => {
    render(<Harness error="Email is required." />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Email is required.");
  });

  it("has no error description and is valid without an error", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("has no Show Password button on other fields", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Show password" })).toBeNull();
  });

  it("shows and hides a password with a stable name and pressed state", async () => {
    render(<Harness type="password" />);
    const input = screen.getByLabelText("Password", { selector: "input" });
    const toggle = screen.getByRole("button", { name: "Show password" });
    await userEvent.type(input, "secret1");
    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("secret1");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveFocus();

    await userEvent.click(toggle);
    expect(input).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the toggle a plain button that does not submit the form", async () => {
    let submitted = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted = true; }}>
        <Harness type="password" />
      </form>,
    );
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("type", "button");
    await userEvent.click(toggle);
    expect(submitted).toBe(false);
  });
});
