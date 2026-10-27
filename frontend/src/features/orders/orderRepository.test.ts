import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  updateDoc: vi.fn(),
}));

import { runTransaction } from "firebase/firestore";
import { StockError } from "../inventory/stock";
import { receiveOrder } from "./orderRepository";
import { OrderError } from "./orderWorkflow";

type Ref = { collection: string; id: string };
const snap = (id: string, data: Record<string, unknown> | null) => ({ id, exists: () => data !== null, data: () => data });

/** Runs receiveOrder against a fake transaction holding the given documents. */
async function receive(docs: { order?: Record<string, unknown> | null; product?: Record<string, unknown> | null }) {
  const tx = {
    get: vi.fn(async (ref: Ref) => (ref.collection === "purchase_orders" ? snap(ref.id, docs.order ?? null) : snap(ref.id, docs.product ?? null))),
    update: vi.fn(),
  };
  vi.mocked(runTransaction).mockImplementation(((_db: unknown, fn: (t: typeof tx) => Promise<void>) => fn(tx)) as never);
  await receiveOrder("order1");
  return tx;
}

const dispatched = { product: "petrol_filter", qty: 10, state: "Dispatched" };
const product = { name: "Petrol Filter", posCount: 1 };

describe("receiveOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks the order received and adds its quantity to the POS record, together", async () => {
    const tx = await receive({ order: dispatched, product });
    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(tx.update).toHaveBeenCalledWith({ collection: "purchase_orders", id: "order1" }, { state: "Received", receivedAt: "SERVER_TIME" });
    expect(tx.update).toHaveBeenCalledWith({ collection: "products", id: "petrol_filter" }, { posCount: 11 });
  });

  it("reads both documents before writing either", async () => {
    const tx = await receive({ order: dispatched, product });
    const lastRead = Math.max(...tx.get.mock.invocationCallOrder);
    const firstWrite = Math.min(...tx.update.mock.invocationCallOrder);
    expect(lastRead).toBeLessThan(firstWrite);
  });

  it("refuses an order that does not exist, changing nothing", async () => {
    await expect(receive({ order: null, product })).rejects.toMatchObject({ code: "not_found" });
  });

  it.each(["Pending", "Accepted", "Received"])("refuses an order that is %s, so nothing is received twice", async (state) => {
    const tx = { get: vi.fn(async () => snap("order1", { ...dispatched, state })), update: vi.fn() };
    vi.mocked(runTransaction).mockImplementation(((_db: unknown, fn: (t: typeof tx) => Promise<void>) => fn(tx)) as never);
    await expect(receiveOrder("order1")).rejects.toBeInstanceOf(OrderError);
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
