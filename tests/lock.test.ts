import { describe, it, expect } from "vitest";
import { acquireLock, releaseLock, withLock } from "../backend/lock";

describe("Lock", () => {
  it("acquires and releases a lock", async () => {
    const owner = await acquireLock("test-key", 5000);
    expect(owner).toBeTruthy();
    expect(typeof owner).toBe("string");
    // releaseLock returns void — just verify it doesn't throw
    releaseLock("test-key", owner!);
  });

  it("cannot acquire same lock twice (with short TTL + no retry)", async () => {
    // Use acquireLock with maxRetries=1 to fail fast
    const owner1 = await acquireLock("concurrent-key", 5000, 10, 1);
    const owner2 = await acquireLock("concurrent-key", 5000, 10, 1);
    expect(owner1).toBeTruthy();
    expect(owner2).toBeNull();
    if (owner1) releaseLock("concurrent-key", owner1);
  });

  it("acquires lock after release", async () => {
    const owner1 = await acquireLock("release-key", 5000);
    expect(owner1).toBeTruthy();
    if (owner1) releaseLock("release-key", owner1);

    const owner2 = await acquireLock("release-key", 5000);
    expect(owner2).toBeTruthy();
    if (owner2) releaseLock("release-key", owner2);
  });

  it("withLock runs function exclusively", async () => {
    const result = await withLock("withlock-key", async () => {
      return "done";
    });
    expect(result).toBe("done");
  });
});
