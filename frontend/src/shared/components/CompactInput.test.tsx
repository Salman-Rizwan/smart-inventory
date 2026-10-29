import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { theme } from "../theme/theme";
import CompactInput from "./CompactInput";

function Harness({ invalid = false }: { invalid?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <ThemeProvider theme={theme}>
      <CompactInput
        name="quantity"
        inputMode="numeric"
        placeholder="Qty…"
        aria-label="Quantity to receive for Spark Plug"
        aria-describedby={invalid ? "qty-error" : undefined}
        invalid={invalid}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <p id="qty-error">Enter a whole number.</p>
    </ThemeProvider>
  );
}

describe("CompactInput", () => {
  it("is a named, controlled text input", async () => {
    render(<Harness />);
    const input = screen.getByRole("textbox", { name: "Quantity to receive for Spark Plug" });
    expect(input).toHaveAttribute("name", "quantity");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("placeholder", "Qty…");
    await userEvent.type(input, "12");
    expect(input).toHaveValue("12");
  });

  it("is valid by default", () => {
    render(<Harness />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
  });

  it("marks itself invalid and links the error message", () => {
    render(<Harness invalid />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a whole number.");
  });
});
