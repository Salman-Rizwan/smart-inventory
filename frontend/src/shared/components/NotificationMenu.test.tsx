import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NotificationMenu, { type NotificationItem } from "./NotificationMenu";

const item = (n: number, onSelect = vi.fn()): NotificationItem => ({
  id: `i${n}`,
  title: `Item ${n}`,
  detail: `Detail ${n}`,
  time: new Date(`2026-10-27T0${n % 9}:00:00Z`),
  onSelect,
});

function setup(items: NotificationItem[], count = items.length) {
  const viewAll = vi.fn();
  render(
    <>
      <NotificationMenu label="Notifications: test" count={count} items={items} emptyText="Nothing new" viewAll={{ label: "View All", onSelect: viewAll }} />
      <button type="button">Elsewhere</button>
    </>,
  );
  return { viewAll, bell: screen.getByRole("button", { name: "Notifications: test" }) };
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
    await userEvent.tab(); // into the panel
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
    await userEvent.tab(); // View All
    await userEvent.tab(); // out of the menu
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("lists the items with their detail and time", async () => {
    const { bell } = setup([item(1), item(2)]);
    await userEvent.click(bell);
    expect(screen.getByRole("button", { name: /Item 1/ })).toHaveTextContent("Detail 1");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(document.querySelectorAll("time")).toHaveLength(2);
  });

  it("selecting an item closes the menu and runs its action", async () => {
    const onSelect = vi.fn();
    const { bell } = setup([item(1, onSelect)]);
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

  it("shows a calm empty state with no items and no View All", async () => {
    const { bell } = setup([], 0);
    await userEvent.click(bell);
    expect(screen.getByText("Nothing new")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View All" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists at most five items and says how many there are", async () => {
    const { bell } = setup(Array.from({ length: 7 }, (_, n) => item(n + 1)));
    await userEvent.click(bell);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Showing 5 of 7")).toBeInTheDocument();
  });

  it("shows the count in the badge, capped at 9+, and none at zero", () => {
    const { unmount } = render(
      <NotificationMenu label="a" count={0} items={[]} emptyText="x" viewAll={{ label: "v", onSelect: vi.fn() }} />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    unmount();
    render(<NotificationMenu label="b" count={12} items={[]} emptyText="x" viewAll={{ label: "v", onSelect: vi.fn() }} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});
