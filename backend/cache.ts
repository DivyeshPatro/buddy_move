import { getRedis, isRedisConnected } from "./redis";
import { logger } from "./logger";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  maxSize: number;
  defaultTTL: number;
}

export class TtlCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private name: string;

  constructor(name: string, opts: Partial<CacheOptions> = {}) {
    this.name = name;
    this.maxSize = opts.maxSize ?? 2000;
    this.defaultTTL = opts.defaultTTL ?? 60_000;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.store.size >= this.maxSize) this.evict();
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private evict(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of this.store) {
      if (v.expiresAt < oldestTime) {
        oldestTime = v.expiresAt;
        oldest = k;
      }
    }
    if (oldest) this.store.delete(oldest);
  }
}

function redisKey(prefix: string, key: string): string {
  return `mv:${prefix}:${key}`;
}

export async function cacheGet<T>(prefix: string, key: string): Promise<T | undefined> {
  const r = getRedis();
  if (r && isRedisConnected()) {
    try {
      const raw = await r.get(redisKey(prefix, key));
      if (raw) return JSON.parse(raw) as T;
    } catch { /* fall through */ }
  }
  return undefined;
}

export async function cacheSet<T>(prefix: string, key: string, value: T, ttl: number): Promise<void> {
  const r = getRedis();
  if (r && isRedisConnected()) {
    try {
      await r.setex(redisKey(prefix, key), Math.ceil(ttl / 1000), JSON.stringify(value));
    } catch { /* fall through */ }
  }
}

export async function cacheDel(prefix: string, key: string): Promise<void> {
  const r = getRedis();
  if (r && isRedisConnected()) {
    try {
      await r.del(redisKey(prefix, key));
    } catch { /* fall through */ }
  }
}

export async function cacheClear(prefix: string): Promise<void> {
  const r = getRedis();
  if (r && isRedisConnected()) {
    try {
      const stream = r.scanStream({ match: `mv:${prefix}:*`, count: 100 });
      stream.on("data", (keys: string[]) => {
        if (keys.length) r.del(...keys);
      });
      await new Promise<void>((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
      });
    } catch (e) {
      logger.warn({ err: e }, "[cache] clear error");
    }
  }
}
