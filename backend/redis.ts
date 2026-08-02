import Redis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL || "";

let client: Redis | null = null;
let connected = false;

export function getRedis(): Redis | null {
  if (client) return client;
  if (!REDIS_URL) return null;
  try {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    client.on("connect", () => { connected = true; logger.info("[redis] connected"); });
    client.on("close", () => { connected = false; });
    client.on("error", (err) => logger.warn({ err }, "[redis] error"));
    return client;
  } catch (e) {
    logger.warn({ err: e }, "[redis] failed to connect — falling back to in-memory");
    return null;
  }
}

export function isRedisConnected(): boolean {
  return connected && client?.status === "ready";
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    connected = false;
  }
}
