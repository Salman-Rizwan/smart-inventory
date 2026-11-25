import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("../../shared/currentUser", () => ({ currentUid: () => "shop-uid" }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  getDoc: vi.fn(),
  // doc(db, collection, id) for a known document; doc(collectionRef) for a new log entry's id
  doc: vi.fn((parent: { name?: string }, collection?: string, id?: string) =>
    collection ? { collection, id } : { collection: parent.name, id: "move1" },
  ),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  updateDoc: vi.fn(),
}));

import { runTransaction, updateDoc } from "firebase/firestore";
import { StockError } from "../inventory/stock";
import { cancelOrder, receiveOrder } from "./orderRepository";
import { OrderError } from "./orderWorkflow";

type Ref = { collection: string; id: string };
const snap = (id: string, data: Record<string, unknown> | null) => ({ id, exists: () => data !== null, data: () => data });

/** Runs receiveOrder against a fake transaction holding the given documents. */
async function receive(docs: { order?: Record<string, unknown> | null; product?: Record<string, unknown> | null }) {
  const tx = {
    get: vi.fn(async (ref: Ref) => (ref.collection === "purchase_orders" ? snap(ref.id, docs.order ?? null) : snap(ref.id, docs.product ?? null))),
    update: vi.fn(),
    set: vi.fn(),
  };
  vi.mocked(runTransaction).mockImplementation(((_db: unknown, fn: (t: typeof tx) => Promise<void>) => fn(tx)) as never);
  await receiveOrder("order1");
  return tx;
}

const dispatched = { product: "petrol_filter", qty: 10, state: "Dispatched" };
const product = { name: "Petrol Filter", posCount: 1, unitCost: 1800 };

describe("receiveOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks the order received, adds its quantity to the POS record and logs it, together", async () => {
    const tx = await receive({ order: dispatched, product });
    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(tx.update).toHaveBeenCalledWith(
      { collection: "purchase_orders", id: "order1" },
      { state: "Received", receivedAt: "SERVER_TIME", receivedBy: "shop-uid" },
    );
    expect(tx.update).toHaveBeenCalledWith({ collection: "products", id: "petrol_filter" }, { posCount: 11, lastMovementId: "move1" });
    expect(tx.set).toHaveBeenCalledWith(
      { collection: "stock_movements", id: "move1" },
      {
        product: "petrol_filter",
        type: "OrderReceived",
        change: 10,
        posBefore: 1,
        posAfter: 11,
        unitCost: 1800,
        unitPrice: null,
        by: "shop-uid",
        orderId: "order1",
        at: "SERVER_TIME",
      },
    );
  });

  it("reads both documents before writing anything", async () => {
    const tx = await receive({ order: dispatched, product });
    const lastRead = Math.max(...tx.get.mock.invocationCallOrder);
    const firstWrite = Math.min(...tx.update.mock.invocationCallOrder, ...tx.set.mock.invocationCallOrder);
    expect(lastRead).toBeLessThan(firstWrite);
  });

  it("refuses an order that does not exist, changing nothing", async () => {
    await expect(receive({ order: null, product })).rejects.toMatchObject({ code: "not_found" });
  });

  it.each(["Pending", "Accepted", "Received"])("refuses an order that is %s, so nothing is received twice", async (state) => {
    const tx = { get: vi.fn(async () => snap("order1", { ...dispatched, state })), update: vi.fn(), set: vi.fn() };
    vi.mocked(runTransaction).mockImplementation(((_db: unknown, fn: (t: typeof tx) => Promise<void>) => fn(tx)) as never);
    await expect(receiveOrder("order1")).rejects.toBeInstanceOf(OrderError);
    await expect(receiveOrder("order1")).rejects.toMatchObject({ code: "moved_on", state });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses a malformed order", async () => {
    await expect(receive({ order: { ...dispatched, qty: 0 }, product })).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses when the product record is missing, changing nothing", async () => {
    await expect(receive({ order: dispatched, product: null })).rejects.toMatchObject({ code: "product_missing" });
  });

  it("refuses a receipt that would overflow the POS record", async () => {
    await expect(receive({ order: dispatched, product: { ...product, posCount: 100_000 } })).rejects.toBeInstanceOf(StockError);
  });
});

describe("cancelOrder", () => {
  it("writes only the state, the server's time, who and why", async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    await cancelOrder("order1", "OrderedByMistake");
    expect(updateDoc).toHaveBeenCalledWith(
      { collection: "purchase_orders", id: "order1" },
      { state: "Cancelled", cancelledAt: "SERVER_TIME", cancelledBy: "shop-uid", cancelReason: "OrderedByMistake" },
    );
  });
});
