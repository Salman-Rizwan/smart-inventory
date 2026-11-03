import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Dialog from "./Dialog";

function setup(busy = false) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <Dialog open title="Adjust Spark Plug" busy={busy} onClose={onClose} onSubmit={onSubmit} actions={<button type="submit">Save</button>}>
      <label>
        Count <input name="count" />
      </label>
    </Dialog>,
  );
  return { onClose, onSubmit };
}

describe("Dialog", () => {
  it("is a modal dialog named by its heading", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Adjust Spark Plug" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Adjust Spark Plug" })).toBeInTheDocument();
  });

  it("moves focus to the first field once open", async () => {
    setup();
    await vi.waitFor(() => expect(screen.getByRole("textbox", { name: "Count" })).toHaveFocus());
  });

  it("submits the form with Enter, without reloading the page", async () => {
    const { onSubmit } = setup();
    await userEvent.type(screen.getByRole("textbox", { name: "Count" }), "3{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].defaultPrevented).toBe(true);
  });

  it("closes with Escape", async () => {
    const { onClose } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("cannot be closed while saving", async () => {
    const { onClose } = setup(true);
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
