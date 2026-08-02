import { describe, it, expect, beforeEach } from "vitest";
import { TtlCache } from "../backend/cache";

describe("TtlCache", () => {
  let cache: TtlCache<number>;

  beforeEach(() => {
    cache = new TtlCache<number>("test", { maxSize: 5, defaultTTL: 60_000 });
  });

  it("stores and retrieves values", () => {
    cache.set("a", 42);
    expect(cache.get("a")).toBe(42);
  });

  it("returns undefined for missing key", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("respects maxSize by evicting oldest entry", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4);
    cache.set("e", 5);
    cache.set("f", 6);
    expect(cache.size).toBeLessThanOrEqual(5);
  });

  it("deletes a key", () => {
    cache.set("a", 42);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
  });

  it("clears all keys", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
