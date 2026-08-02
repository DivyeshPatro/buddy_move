import { randomUUID } from "crypto";
import { logger } from "./logger";
import { getRedis, isRedisConnected } from "./redis";

// ── In-memory lock (single-process fallback) ───────────────────────────────
const locks = new Map<string, { owner: string; acquiredAt: number }>();
const LOCK_TTL_MS = 30_000;
const REDIS_LOCK_PREFIX = "lock:";

// ── Redis distributed lock (preferred when Redis is connected) ─────────────
async function acquireRedisLock(
  key: string,
  ttlMs: number,
  retryDelayMs: number,
  maxRetries: number
): Promise<string | null> {
  const redis = getRedis();
  if (!redis || !isRedisConnected()) return null;

  const owner = randomUUID();
  const redisKey = REDIS_LOCK_PREFIX + key;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const acquired = await redis.set(redisKey, owner, "PX", ttlMs, "NX");
      if (acquired === "OK") return owner;
    } catch {
      return null; // Redis error — fall through to in-memory is handled by caller
    }
    await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  return null;
}

async function releaseRedisLock(key: string, owner: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis || !isRedisConnected()) return;
    const redisKey = REDIS_LOCK_PREFIX + key;
    // Only delete if we still own the lock (atomic Lua script).
    const script = `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`;
    await redis.eval(script, 1, redisKey, owner);
  } catch {
    // Best-effort release.
  }
}

async function acquireMemoryLock(
  key: string,
  ttlMs: number,
  retryDelayMs: number,
  maxRetries: number
): Promise<string | null> {
  const owner = randomUUID();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const existing = locks.get(key);
    if (!existing || Date.now() - existing.acquiredAt > ttlMs) {
      locks.set(key, { owner, acquiredAt: Date.now() });
      return owner;
    }
    await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  return null;
}

export async function acquireLock(
  key: string,
  ttlMs: number = LOCK_TTL_MS,
  retryDelayMs: number = 100,
  maxRetries: number = 50
): Promise<string | null> {
  // Try Redis first (distributed), fall back to in-memory (single-process).
  const redisOwner = await acquireRedisLock(key, ttlMs, retryDelayMs, maxRetries);
  if (redisOwner) {
    logger.debug({ lockKey: key, backend: "redis" }, "Lock acquired via Redis");
    return redisOwner;
  }
  const memOwner = await acquireMemoryLock(key, ttlMs, retryDelayMs, maxRetries);
  if (memOwner) {
    logger.debug({ lockKey: key, backend: "memory" }, "Lock acquired via in-memory");
    return memOwner;
  }
  return null;
}

export async function releaseLock(key: string, owner: string): Promise<void> {
  await releaseRedisLock(key, owner);
  const existing = locks.get(key);
  if (existing?.owner === owner) {
    locks.delete(key);
  }
}

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = LOCK_TTL_MS
): Promise<T> {
  // Bound acquisition time to avoid hanging forever. Use ttlMs + buffer.
  const acquireTimeout = Math.max(30000, ttlMs + 5000);
  const owner = await Promise.race([
    acquireLock(key, ttlMs),
    new Promise<string | null>((resolve) => setTimeout(() => resolve(null), acquireTimeout)),
  ]);
  if (!owner) {
    throw new Error(`Could not acquire lock for key: ${key}`);
  }
  try {
    return await fn();
  } finally {
    await releaseLock(key, owner);
  }
}
