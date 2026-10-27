import { describe, expect, it } from "vitest";
import { MAX_READ_KEYS, PRUNE_THRESHOLD, pruneKeys } from "./readState";

const many = (n: number, prefix = "old") => Array.from({ length: n }, (_, i) => `${prefix}:${i}`);

describe("pruneKeys", () => {
  it("keeps every key that is still active", () => {
    const keys = [...many(300), "alert:live"];
    expect(pruneKeys(keys, new Set(["alert:live"]))).toContain("alert:live");
  });

  it("keeps only the most recent 100 keys whose notifications are gone", () => {
    const pruned = pruneKeys(many(300), new Set());
    expect(pruned).toHaveLength(100);
    expect(pruned[0]).toBe("old:200");
    expect(pruned.at(-1)).toBe("old:299");
  });

  it("keeps the original order", () => {
    const keys = ["a", "live1", "b", "live2", "c"];
    expect(pruneKeys(keys, new Set(["live1", "live2"]))).toEqual(keys);
  });

  it("changes nothing when there is little to forget", () => {
    expect(pruneKeys(["a", "b"], new Set())).toEqual(["a", "b"]);
    expect(pruneKeys([], new Set(["x"]))).toEqual([]);
  });

  it("brings an over-threshold list safely under the cap", () => {
    expect(pruneKeys(many(PRUNE_THRESHOLD + 50), new Set()).length).toBeLessThan(MAX_READ_KEYS);
  });
});
