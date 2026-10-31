import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { documentTitle, useDocumentTitle } from "./useDocumentTitle";

describe("documentTitle", () => {
  it("names the page, then the app", () => {
    expect(documentTitle("Alerts")).toBe("Alerts · Smart Inventory");
    expect(documentTitle()).toBe("Smart Inventory");
  });

  it("puts the unread count first so it shows in a narrow tab", () => {
    expect(documentTitle("Orders", 2)).toBe("(2) Orders · Smart Inventory");
    expect(documentTitle(undefined, 1)).toBe("(1) Smart Inventory");
    expect(documentTitle("Orders", 0)).toBe("Orders · Smart Inventory");
  });
});

describe("useDocumentTitle", () => {
  it("sets the title, follows changes, and restores the plain name when unmounted", () => {
    const { rerender, unmount } = renderHook(({ page, count }) => useDocumentTitle(page, count), {
      initialProps: { page: "Dashboard", count: 0 },
    });
    expect(document.title).toBe("Dashboard · Smart Inventory");
    rerender({ page: "Alerts", count: 3 });
    expect(document.title).toBe("(3) Alerts · Smart Inventory");
    unmount();
    expect(document.title).toBe("Smart Inventory");
  });
});
