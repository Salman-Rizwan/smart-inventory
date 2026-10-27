import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  arrayUnion: vi.fn((...keys: string[]) => ({ union: keys })),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
}));

import { onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import { markKeysRead, parseReadKeys, pruneReadKeys, subscribeReadKeys } from "./readRepository";

describe("parseReadKeys", () => {
  it("reads the list of keys", () => {
    expect(parseReadKeys({ readKeys: ["alert:a1", "order:o1:Pending"] })).toEqual(["alert:a1", "order:o1:Pending"]);
  });

  it.each([undefined, {}, { readKeys: "alert:a1" }, { readKeys: null }, { readKeys: { 0: "x" } }])("treats %j as none read", (data) => {
    expect(parseReadKeys(data as Record<string, unknown> | undefined)).toEqual([]);
  });

  it("drops anything that is not text", () => {
    expect(parseReadKeys({ readKeys: ["ok", 5, null, { a: 1 }, "also-ok"] })).toEqual(["ok", "also-ok"]);
  });
});

describe("subscribeReadKeys", () => {
  beforeEach(() => vi.clearAllMocks());

  const subscribe = (snap: { exists: () => boolean; data: () => unknown }) => {
    vi.mocked(onSnapshot).mockImplementation(((_ref: unknown, onData: (s: typeof snap) => void) => {
      onData(snap);
      return () => {};
    }) as never);
    const onKeys = vi.fn();
    subscribeReadKeys("u1", onKeys, vi.fn());
    return onKeys;
  };

  it("passes the user's keys on", () => {
    expect(subscribe({ exists: () => true, data: () => ({ readKeys: ["a"] }) })).toHaveBeenCalledWith(["a"]);
  });

  it("treats a missing document as nothing read yet", () => {
    expect(subscribe({ exists: () => false, data: () => undefined })).toHaveBeenCalledWith([]);
  });

  it("listens to the user's own document", () => {
    subscribe({ exists: () => false, data: () => undefined });
    expect(vi.mocked(onSnapshot).mock.calls[0][0]).toEqual({ collection: "notification_reads", id: "u1" });
  });
});

describe("markKeysRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds the keys atomically and creates the document if it is missing", async () => {
    await markKeysRead("u1", ["alert:a1", "alert:a2"]);
    expect(setDoc).toHaveBeenCalledWith(
      { collection: "notification_reads", id: "u1" },
      { readKeys: { union: ["alert:a1", "alert:a2"] } },
      { merge: true },
    );
  });

  it("does nothing for an empty list", async () => {
    await markKeysRead("u1", []);
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe("pruneReadKeys", () => {
  beforeEach(() => vi.clearAllMocks());

  const run = async (stored: string[], active: string[]) => {
    const tx = { get: vi.fn(async () => ({ exists: () => true, data: () => ({ readKeys: stored }) })), set: vi.fn() };
    vi.mocked(runTransaction).mockImplementation(((_db: unknown, fn: (t: typeof tx) => Promise<void>) => fn(tx)) as never);
    await pruneReadKeys("u1", new Set(active));
    return tx;
  };

  it("replaces the list when stale keys can be forgotten", async () => {
    const stored = Array.from({ length: 300 }, (_, i) => `old:${i}`);
    const tx = await run(stored, ["old:5"]);
    const written = tx.set.mock.calls[0][1] as { readKeys: string[] };
    expect(written.readKeys).toHaveLength(101); // the active key plus the 100 most recent
    expect(written.readKeys).toContain("old:5");
  });

  it("writes nothing when there is nothing to forget", async () => {
    const tx = await run(["a", "b"], []);
    expect(tx.set).not.toHaveBeenCalled();
  });
});
