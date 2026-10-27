import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../alerts/AlertsContext", () => ({ useAlerts: vi.fn() }));
vi.mock("../orders/OrdersContext", () => ({ useOrders: vi.fn() }));
vi.mock("./readRepository", () => ({ subscribeReadKeys: vi.fn(), markKeysRead: vi.fn(), pruneReadKeys: vi.fn() }));

import type { Alert } from "../alerts/types";
import { useAlerts } from "../alerts/AlertsContext";
import { useOrders } from "../orders/OrdersContext";
import type { Order, OrderRole, OrderState } from "../orders/types";
import { NotificationsProvider, useNotifications } from "./NotificationsContext";
import { markKeysRead, pruneReadKeys, subscribeReadKeys } from "./readRepository";

const alert = (id: string, state: Alert["state"] = "Open"): Alert => ({
  id,
  product: "spark_plug",
  state,
  visualCount: 3,
  posCount: 4,
  createdAt: new Date("2026-10-27T05:00:00Z"),
});
const order = (id: string, state: OrderState): Order => ({
  id,
  product: "petrol_filter",
  qty: 10,
  state,
  createdAt: new Date("2026-10-27T01:00:00Z"),
});

let push: (keys: string[]) => void = () => {};
let fail: (error: unknown) => void = () => {};
let stored: string[] = [];

function arrange({
  alerts = [] as Alert[],
  orders = [] as Order[],
  initial = [] as string[],
  answers = true,
  alertsLoading = false,
} = {}) {
  stored = [...initial];
  vi.mocked(useAlerts).mockReturnValue({ enabled: true, alerts, openCount: 0, loading: alertsLoading, error: "" });
  vi.mocked(useOrders).mockReturnValue({
    enabled: true,
    role: "shopkeeper",
    orders,
    pendingCount: 0,
    attentionCount: 0,
    loading: false,
    error: "",
  });
  vi.mocked(subscribeReadKeys).mockImplementation((_uid, onData, onError) => {
    push = onData;
    fail = onError;
    if (answers) onData(stored);
    return () => {};
  });
  // a fake store: marking keys read updates what the listener sees, like Firestore does
  vi.mocked(markKeysRead).mockImplementation(async (_uid, keys) => {
    stored = [...new Set([...stored, ...keys])];
    push(stored);
  });
  vi.mocked(pruneReadKeys).mockResolvedValue(undefined);
}

function Probe() {
  const n = useNotifications();
  return (
    <div>
      <p data-testid="summary">{`ready=${n.ready} unread=${n.unreadCount} total=${n.items.length} degraded=${n.readStateError}`}</p>
      <p data-testid="items">{n.items.map((i) => `${i.key}${i.unread ? "*" : ""}`).join(",")}</p>
      <p data-testid="error">{n.saveError}</p>
      <button onClick={() => n.markRead(["alert:a1"])}>read a1</button>
      <button onClick={() => n.markRead(["alert:a1", "nope", "alert:a2"])}>read mixed</button>
      <button onClick={n.markAllRead}>read all</button>
    </div>
  );
}

const mount = (role: OrderRole = "shopkeeper") =>
  render(
    <NotificationsProvider uid="u1" role={role}>
      <Probe />
    </NotificationsProvider>,
  );
const summary = () => screen.getByTestId("summary").textContent;
const click = async (name: string) => {
  await act(async () => screen.getByRole("button", { name }).click());
};

describe("NotificationsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "Smart Inventory";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows no badge while loading, so it never flashes a wrong number", () => {
    arrange({ alerts: [alert("a1")], answers: false });
    mount();
    expect(summary()).toBe("ready=false unread=0 total=1 degraded=false");
    expect(document.title).toBe("Smart Inventory");
  });

  it("is not ready while the alerts are still loading either", () => {
    arrange({ alerts: [alert("a1")], alertsLoading: true });
    mount();
    expect(summary()).toContain("ready=false unread=0");
  });

  it("starts with everything unread, and puts the count in the tab title", () => {
    arrange({ alerts: [alert("a1"), alert("a2")], orders: [order("o1", "Dispatched")] });
    mount();
    expect(summary()).toBe("ready=true unread=3 total=3 degraded=false");
    expect(document.title).toBe("(3) Smart Inventory");
  });

  it("lists only what needs the role's attention", () => {
    arrange({ alerts: [alert("a1"), alert("a2", "Acknowledged")], orders: [order("o1", "Pending"), order("o2", "Dispatched"), order("o3", "Received")] });
    mount();
    expect(screen.getByTestId("items")).toHaveTextContent("alert:a1*,order:o2:Dispatched*");
  });

  it("gives the dealer pending orders only", () => {
    arrange({ alerts: [alert("a1")], orders: [order("o1", "Pending"), order("o2", "Dispatched")] });
    mount("dealer");
    expect(screen.getByTestId("items")).toHaveTextContent("order:o1:Pending*");
    expect(summary()).toContain("unread=1");
  });

  it("counts a read item as read from the start", () => {
    arrange({ alerts: [alert("a1"), alert("a2")], initial: ["alert:a1"] });
    mount();
    expect(summary()).toContain("unread=1 total=2");
    expect(screen.getByTestId("items")).toHaveTextContent("alert:a2*,alert:a1");
  });

  it("marking one read lowers the count and the tab title at once, and keeps the item listed", async () => {
    arrange({ alerts: [alert("a1"), alert("a2")] });
    mount();
    await click("read a1");
    expect(markKeysRead).toHaveBeenCalledWith("u1", ["alert:a1"]);
    expect(summary()).toContain("unread=1 total=2");
    expect(document.title).toBe("(1) Smart Inventory");
  });

  it("saves only keys that are really unread, ignoring unknown and already-read ones", async () => {
    arrange({ alerts: [alert("a1"), alert("a2")], initial: ["alert:a1"] });
    mount();
    await click("read mixed");
    expect(markKeysRead).toHaveBeenCalledWith("u1", ["alert:a2"]);
  });

  it("saves nothing when nothing is unread", async () => {
    arrange({ alerts: [alert("a1")], initial: ["alert:a1"] });
    mount();
    await click("read a1");
    expect(markKeysRead).not.toHaveBeenCalled();
  });

  it("marks everything read and restores the plain tab title", async () => {
    arrange({ alerts: [alert("a1")], orders: [order("o1", "Dispatched")] });
    mount();
    await click("read all");
    expect(markKeysRead).toHaveBeenCalledWith("u1", expect.arrayContaining(["alert:a1", "order:o1:Dispatched"]));
    expect(summary()).toContain("unread=0 total=2");
    expect(document.title).toBe("Smart Inventory");
  });

  it("follows changes made in another window", () => {
    arrange({ alerts: [alert("a1"), alert("a2")] });
    mount();
    act(() => push(["alert:a1", "alert:a2"]));
    expect(summary()).toContain("unread=0");
  });

  it("treats a new alert as unread even after others were read", () => {
    arrange({ alerts: [alert("a1")], initial: ["alert:a1"] });
    const { rerender } = mount();
    vi.mocked(useAlerts).mockReturnValue({ enabled: true, alerts: [alert("a1"), alert("a9")], openCount: 0, loading: false, error: "" });
    rerender(
      <NotificationsProvider uid="u1" role="shopkeeper">
        <Probe />
      </NotificationsProvider>,
    );
    expect(summary()).toContain("unread=1 total=2");
  });

  it("drops an item once it is handled, whether or not it was read", () => {
    arrange({ alerts: [alert("a1")] });
    const { rerender } = mount();
    vi.mocked(useAlerts).mockReturnValue({ enabled: true, alerts: [alert("a1", "Acknowledged")], openCount: 0, loading: false, error: "" });
    rerender(
      <NotificationsProvider uid="u1" role="shopkeeper">
        <Probe />
      </NotificationsProvider>,
    );
    expect(summary()).toContain("unread=0 total=0");
  });

  it("shows a message and keeps the item unread when saving fails", async () => {
    arrange({ alerts: [alert("a1")] });
    vi.mocked(markKeysRead).mockRejectedValue(new Error("offline"));
    mount();
    await click("read a1");
    expect(screen.getByTestId("error")).toHaveTextContent("Could not save that as read");
    expect(summary()).toContain("unread=1");
  });

  it("falls back to everything unread, and saves nothing, when the read list cannot be loaded", async () => {
    arrange({ alerts: [alert("a1")], orders: [order("o1", "Dispatched")], answers: false });
    mount();
    act(() => fail(new Error("permission-denied")));
    expect(summary()).toBe("ready=true unread=2 total=2 degraded=true");
    await click("read all");
    expect(markKeysRead).not.toHaveBeenCalled();
  });

  it("tidies the read list when it grows long, and not before", () => {
    arrange({ alerts: [alert("a1")], initial: Array.from({ length: 450 }, (_, i) => `old:${i}`) });
    mount();
    expect(pruneReadKeys).toHaveBeenCalledWith("u1", new Set(["alert:a1"]));
    vi.clearAllMocks();
    arrange({ alerts: [alert("a1")], initial: ["a", "b"] });
    mount();
    expect(pruneReadKeys).not.toHaveBeenCalled();
  });

  it("restores the plain tab title on unmount", () => {
    arrange({ alerts: [alert("a1")] });
    const { unmount } = mount();
    expect(document.title).toBe("(1) Smart Inventory");
    unmount();
    expect(document.title).toBe("Smart Inventory");
  });
});
