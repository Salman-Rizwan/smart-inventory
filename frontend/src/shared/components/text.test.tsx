import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Muted, VisuallyHidden } from "./text";

describe("VisuallyHidden", () => {
  it("stays in the accessibility tree but takes no space on screen", () => {
    render(
      <button type="button">
        Orders<VisuallyHidden>, 2 need your action</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole("button", { name: "Orders, 2 need your action" })).toBeInTheDocument();
    const hidden = screen.getByText(", 2 need your action");
    expect(hidden.tagName).toBe("SPAN");
    expect(getComputedStyle(hidden).position).toBe("absolute");
    expect(getComputedStyle(hidden).width).toBe("1px");
  });

  it("can be a live status line or a heading", () => {
    render(
      <>
        <VisuallyHidden component="p" role="status" aria-live="polite">
          Saved.
        </VisuallyHidden>
        <VisuallyHidden component="h2">Current Counts</VisuallyHidden>
      </>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(screen.getByRole("heading", { level: 2, name: "Current Counts" })).toBeInTheDocument();
  });
});

describe("Muted", () => {
  it("is a paragraph in the muted ink colour", () => {
    render(<Muted>Last scan: none yet</Muted>);
    const text = screen.getByText("Last scan: none yet");
    expect(text.tagName).toBe("P");
    expect(getComputedStyle(text).color).toBe("rgb(82, 82, 82)");
  });
});
