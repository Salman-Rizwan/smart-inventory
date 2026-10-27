import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NotificationMenu, { type NotificationItem } from "./NotificationMenu";

const item = (n: number, unread = true, onSelect = vi.fn()): NotificationItem => ({
  id: `i${n}`,
  title: `Item ${n}`,
  detail: `Detail ${n}`,
  time: new Date(`2026-10-27T0${n % 9}:00:00Z`),
  unread,
  onSelect,
});

function setup(items: NotificationItem[], count = items.filter((i) => i.unread).length, notice?: string) {
  const viewAll = vi.fn();
  const onMarkAllRead = vi.fn();
  render(
    <>
      <NotificationMenu
        label="Notifications: test"
        count={count}
        items={items}
        emptyText="Nothing new"
        viewAll={{ label: "View All", onSelect: viewAll }}
        onMarkAllRead={onMarkAllRead}
        notice={notice}
      />
      <button type="button">Elsewhere</button>
    </>,
  );
  return { viewAll, onMarkAllRead, bell: screen.getByRole("button", { name: "Notifications: test" }) };
}

describe("NotificationMenu", () => {
  it("starts closed and opens on click, reporting its state to assistive tech", async () => {
    const { bell } = setup([item(1)]);
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
    expect(bell).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(bell);

    expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    expect(bell).toHaveAttribute("aria-expanded", "true");
    expect(bell).toHaveAttribute("aria-controls", screen.getByRole("region").id);
  });

  it("closes when the bell is clicked again", async () => {
    const { bell } = setup([item(1)]);
    await userEvent.click(bell);
    await userEvent.click(bell);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the bell", async () => {
    const { bell } = setup([item(1)]);
    await userEvent.click(bell);
    await userEvent.tab();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });

  it("closes when you click elsewhere", async () => {
    const { bell } = setup([item(1)]);
    await userEvent.click(bell);
    await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("closes when keyboard focus leaves it, but not while tabbing through its items", async () => {
    const { bell } = setup([item(1), item(2)]);
    await userEvent.click(bell);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /Item 1/ })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /Item 2/ })).toHaveFocus();
    expect(screen.getByRole("region")).toBeInTheDocument();
    await userEvent.tab(); // Mark All as Read
    await userEvent.tab(); // View All
    await userEvent.tab(); // out of the menu
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  describe("unread and read", () => {
    it("marks unread items as unread for screen readers, and read items as nothing special", async () => {
      const { bell } = setup([item(1, true), item(2, false)]);
      await userEvent.click(bell);
      expect(screen.getByRole("button", { name: /^Unread: Item 1/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Item 2/ })).toBeInTheDocument(); // no "Unread:" prefix
    });

    it("styles unread items differently from read ones, and does not rely on colour alone", async () => {
      const { bell } = setup([item(1, true), item(2, false)]);
      await userEvent.click(bell);
      expect(screen.getByRole("button", { name: /Item 1/ })).toHaveClass("notify__item--unread");
      expect(screen.getByRole("button", { name: /Item 2/ })).not.toHaveClass("notify__item--unread");
      expect(document.querySelectorAll(".notify__dot")).toHaveLength(1);
    });

    it("says how many are new in the header, and nothing when all are read", async () => {
      const { bell } = setup([item(1, true), item(2, true), item(3, false)]);
      await userEvent.click(bell);
      expect(screen.getByText("2 new")).toBeInTheDocument();
    });

    it("keeps read items listed", async () => {
      const { bell } = setup([item(1, false), item(2, false)], 0);
      await userEvent.click(bell);
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
      expect(screen.queryByText(/new$/)).not.toBeInTheDocument();
    });
  });

  describe("Mark All as Read", () => {
    it("runs the handler, keeps the menu open and announces it", async () => {
      const { bell, onMarkAllRead } = setup([item(1), item(2)]);
      await userEvent.click(bell);
      await userEvent.click(screen.getByRole("button", { name: "Mark All as Read" }));
      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
      expect(screen.getByText("All notifications marked as read.")).toBeInTheDocument();
    });

    it("is disabled when nothing is unread", async () => {
      const { bell } = setup([item(1, false)], 0);
      await userEvent.click(bell);
      expect(screen.getByRole("button", { name: "Mark All as Read" })).toBeDisabled();
    });
  });

  it("selecting an item closes the menu and runs its action", async () => {
    const onSelect = vi.fn();
    const { bell } = setup([item(1, true, onSelect)]);
    await userEvent.click(bell);
    await userEvent.click(screen.getByRole("button", { name: /Item 1/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("View All closes the menu and runs its action", async () => {
    const { bell, viewAll } = setup([item(1)]);
    await userEvent.click(bell);
    await userEvent.click(screen.getByRole("button", { name: "View All" }));
    expect(viewAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows a calm empty state with no items and no actions", async () => {
    const { bell } = setup([], 0);
    await userEvent.click(bell);
    expect(screen.getByText("Nothing new")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark All as Read" })).not.toBeInTheDocument();
  });

  it("shows a notice above the list when one is given", async () => {
    const { bell } = setup([item(1)], 1, "Read status is unavailable right now.");
    await userEvent.click(bell);
    expect(screen.getByText("Read status is unavailable right now.")).toBeInTheDocument();
  });

  it("lists at most five items and says how many there are", async () => {
    const { bell } = setup(Array.from({ length: 7 }, (_, n) => item(n + 1)));
    await userEvent.click(bell);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Showing 5 of 7")).toBeInTheDocument();
  });

  it("shows the unread count in the badge, capped at 9+, and none at zero", () => {
    const { unmount } = render(
      <NotificationMenu label="a" count={0} items={[]} emptyText="x" viewAll={{ label: "v", onSelect: vi.fn() }} onMarkAllRead={vi.fn()} />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    unmount();
    render(<NotificationMenu label="b" count={12} items={[]} emptyText="x" viewAll={{ label: "v", onSelect: vi.fn() }} onMarkAllRead={vi.fn()} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});
