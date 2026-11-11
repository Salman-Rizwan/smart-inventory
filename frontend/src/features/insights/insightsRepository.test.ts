import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, name: string) => name),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((field: string) => ({ orderBy: field })),
  query: vi.fn((...parts: unknown[]) => parts),
  where: vi.fn((field: string, op: string, value: unknown) => ({ where: field, op, value })),
}));

import { onSnapshot, orderBy, query, where } from "firebase/firestore";
import { subscribeMovementsSince, subscribeOrdersSince } from "./insightsRepository";

const SINCE = new Date("2026-05-16T00:00:00Z");
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

function answer(docs: { id: string; data: () => Record<string, unknown> }[]) {
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, onData: (snap: unknown) => void) => {
    onData({ docs });
    return () => {};
  }) as never);
}

describe("subscribeMovementsSince", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for stock changes from the window start, ordered by their time only (no index needed)", () => {
    answer([]);
    subscribeMovementsSince(SINCE, () => {}, () => {});
    expect(where).toHaveBeenCalledWith("at", ">=", SINCE);
    expect(orderBy).toHaveBeenCalledWith("at");
    expect(query).toHaveBeenCalledWith("stock_movements", { where: "at", op: ">=", value: SINCE }, { orderBy: "at" });
  });

  it("passes on the parsed entries and leaves malformed or pending ones out", () => {
    const good = { product: "spark_plug", type: "Sale", change: -1, posBefore: 5, posAfter: 4, at: ts("2026-06-01T04:00:00Z") };
    answer([
      { id: "m1", data: () => good },
      { id: "m2", data: () => ({ ...good, at: null }) },
      { id: "m3", data: () => ({ ...good, type: "Gift" }) },
    ]);
    const onData = vi.fn();
    subscribeMovementsSince(SINCE, onData, () => {});
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData.mock.calls[0][0].map((m: { id: string }) => m.id)).toEqual(["m1"]);
  });
});

describe("subscribeOrdersSince", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for orders raised from the window start, ordered by createdAt only", () => {
    answer([]);
    subscribeOrdersSince(SINCE, () => {}, () => {});
    expect(where).toHaveBeenCalledWith("createdAt", ">=", SINCE);
    expect(orderBy).toHaveBeenCalledWith("createdAt");
    expect(query).toHaveBeenCalledWith("purchase_orders", { where: "createdAt", op: ">=", value: SINCE }, { orderBy: "createdAt" });
  });

  it("passes on the parsed orders and hands errors to the caller", () => {
    answer([{ id: "o1", data: () => ({ product: "spark_plug", qty: 10, state: "Received" }) }, { id: "o2", data: () => ({ qty: 0 }) }]);
    const onData = vi.fn();
    subscribeOrdersSince(SINCE, onData, () => {});
    expect(onData.mock.calls[0][0]).toHaveLength(1);
    const onError = vi.fn();
    vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _onData: unknown, onErr: (e: Error) => void) => {
      onErr(new Error("permission-denied"));
      return () => {};
    }) as never);
    subscribeOrdersSince(SINCE, () => {}, onError);
    expect(onError).toHaveBeenCalled();
  });
});
