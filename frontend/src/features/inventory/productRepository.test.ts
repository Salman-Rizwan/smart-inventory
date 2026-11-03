import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("../../shared/currentUser", async () => {
  const actual = await vi.importActual<typeof import("../../shared/currentUser")>("../../shared/currentUser");
  return { ...actual, currentUid: vi.fn(() => "shop-uid") };
});
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn((parent: { name?: string }, collection?: string, id?: string) =>
    collection ? { collection, id } : { collection: parent.name, id: "move1" },
  ),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  updateDoc: vi.fn(),
}));

import { runTransaction, updateDoc } from "firebase/firestore";
import { currentUid, SignedOutError } from "../../shared/currentUser";
import { changeStock, savePartSettings } from "./productRepository";

const snap = (data: Record<string, unknown> | null) => ({ id: "spark_plug", exists: () => data !== null, data: () => data });

function withProduct(data: Record<string, unknown> | null) {
  const tx = { get: vi.fn(async () => snap(data)), update: vi.fn(), set: vi.fn() };
  vi.mocked(runTransaction).mockImplementation(((_db: unknown, fn: (t: typeof tx) => Promise<unknown>) => fn(tx)) as never);
  return tx;
}

describe("changeStock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the log entry and the POS change together, linked by lastMovementId", async () => {
    const tx = withProduct({ name: "Spark Plug", posCount: 4, unitCost: 950, unitPrice: 1250 });
    await expect(changeStock("spark_plug", { type: "Sale" })).resolves.toBe(3);
    expect(tx.set).toHaveBeenCalledWith(
      { collection: "stock_movements", id: "move1" },
      {
        product: "spark_plug",
        type: "Sale",
        change: -1,
        posBefore: 4,
        posAfter: 3,
        unitCost: 950,
        unitPrice: 1250,
        by: "shop-uid",
        at: "SERVER_TIME",
      },
    );
    expect(tx.update).toHaveBeenCalledWith({ collection: "products", id: "spark_plug" }, { posCount: 3, lastMovementId: "move1" });
  });

  it("reads the product before writing", async () => {
    const tx = withProduct({ posCount: 4 });
    await changeStock("spark_plug", { type: "Receipt", qty: 2 });
    expect(Math.max(...tx.get.mock.invocationCallOrder)).toBeLessThan(
      Math.min(...tx.set.mock.invocationCallOrder, ...tx.update.mock.invocationCallOrder),
    );
  });

  it("writes an adjustment with its reason", async () => {
    const tx = withProduct({ posCount: 4 });
    await changeStock("spark_plug", { type: "Adjustment", target: 1, reason: "LostOrStolen" });
    expect(tx.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: "Adjustment", change: -3, reason: "LostOrStolen" }));
  });

  it("refuses a missing or damaged record, writing nothing", async () => {
    let tx = withProduct(null);
    await expect(changeStock("spark_plug", { type: "Sale" })).rejects.toMatchObject({ code: "not_found" });
    expect(tx.set).not.toHaveBeenCalled();
    tx = withProduct({ posCount: "4" });
    await expect(changeStock("spark_plug", { type: "Sale" })).rejects.toMatchObject({ code: "invalid_record" });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses an invalid change inside the transaction, writing nothing", async () => {
    const tx = withProduct({ posCount: 0 });
    await expect(changeStock("spark_plug", { type: "Sale" })).rejects.toMatchObject({ code: "insufficient" });
    expect(tx.set).not.toHaveBeenCalled();
  });

  it("asks the user to sign in again when the session has ended", async () => {
    vi.mocked(currentUid).mockImplementationOnce(() => {
      throw new SignedOutError();
    });
    expect(() => changeStock("spark_plug", { type: "Sale" })).toThrow(expect.objectContaining({ code: "signed_out" }));
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe("savePartSettings", () => {
  it("writes the settings with who changed them and the server's time", async () => {
    await savePartSettings("spark_plug", { unitCost: 950, unitPrice: null, reorderLevel: 3, reorderQty: 0 });
    expect(updateDoc).toHaveBeenCalledWith(
      { collection: "products", id: "spark_plug" },
      { unitCost: 950, unitPrice: null, reorderLevel: 3, reorderQty: 0, updatedBy: "shop-uid", updatedAt: "SERVER_TIME" },
    );
  });
});
