import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function Broken(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders its children when nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a recovery message with a next step instead of a blank page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something Went Wrong");
    expect(alert).toHaveTextContent("Reload the page to continue.");
    expect(screen.getByRole("button", { name: "Reload Page" })).toBeInTheDocument();
  });

  it("logs the error for diagnosis", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(log).toHaveBeenCalledWith("Unhandled UI error", expect.any(Error), expect.anything());
  });
});
