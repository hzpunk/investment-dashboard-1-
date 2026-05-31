import "server-only"

import Redis from "ioredis"
import { createLogger } from "@/lib/logger"

const logger = createLogger("Redis")

declare global {
  var redisClient: Redis | undefined
  var redisUnavailableLogged: boolean | undefined
}

function cacheEnabled() {
  return process.env.CACHE_ENABLED !== "false" && Boolean(process.env.REDIS_URL)
}

export function isRedisEnabled() {
  return cacheEnabled()
}

export function getRedisClient(): Redis | null {
  if (!cacheEnabled()) return null

  if (process.env.NODE_ENV !== "production" && global.redisClient) {
    return global.redisClient
  }

  const client = new Redis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 500,
    commandTimeout: 1000,
  })

  client.on("error", (error) => {
    if (process.env.NODE_ENV !== "production" && !global.redisUnavailableLogged) {
      global.redisUnavailableLogged = true
      logger.warn("Redis unavailable; falling back to direct calculations", error instanceof Error ? error.message : error)
    }
  })

  if (process.env.NODE_ENV !== "production") {
    global.redisClient = client
  }

  return client
}

async function ensureConnected(client: Redis) {
  if (client.status === "ready") return true
  if (client.status === "connecting" || client.status === "connect") return true

  try {
    await client.connect()
    return true
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && !global.redisUnavailableLogged) {
      global.redisUnavailableLogged = true
      logger.warn("Redis connection failed; cache disabled for this request", error instanceof Error ? error.message : error)
    }
    return false
  }
}

export async function safeRedisGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client || !(await ensureConnected(client))) return null

  try {
    const raw = await client.get(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("Redis get failed", { key, error: error instanceof Error ? error.message : error })
    }
    return null
  }
}

export async function safeRedisSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const client = getRedisClient()
  if (!client || !(await ensureConnected(client))) return false

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds)
    return true
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("Redis set failed", { key, error: error instanceof Error ? error.message : error })
    }
    return false
  }
}

export async function safeRedisDel(key: string): Promise<number> {
  const client = getRedisClient()
  if (!client || !(await ensureConnected(client))) return 0

  try {
    return await client.del(key)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("Redis delete failed", { key, error: error instanceof Error ? error.message : error })
    }
    return 0
  }
}

export async function safeRedisDelByPattern(pattern: string): Promise<number> {
  const client = getRedisClient()
  if (!client || !(await ensureConnected(client))) return 0

  let cursor = "0"
  let deleted = 0

  try {
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100)
      cursor = nextCursor
      if (keys.length > 0) {
        deleted += await client.del(...keys)
      }
    } while (cursor !== "0")

    return deleted
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("Redis pattern delete failed", { pattern, error: error instanceof Error ? error.message : error })
    }
    return deleted
  }
}
