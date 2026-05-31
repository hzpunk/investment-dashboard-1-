import "server-only"

import { createLogger } from "@/lib/logger"
import { safeRedisGet, safeRedisSet } from "@/lib/redis"

const logger = createLogger("ServerCache")

type CachedOptions<T> = {
  key: string
  ttlSeconds: number
  fetcher: () => Promise<T>
  label?: string
}

function cacheLabel(key: string, label?: string) {
  return label ?? key.split(":").slice(-2).join(":")
}

export async function cached<T>({ key, ttlSeconds, fetcher, label }: CachedOptions<T>): Promise<T> {
  const startedAt = performance.now()
  const cachedValue = await safeRedisGet<T>(key)
  const name = cacheLabel(key, label)

  if (cachedValue !== null) {
    if (process.env.NODE_ENV !== "production") {
      logger.info(`HIT ${name} in ${Math.round(performance.now() - startedAt)}ms`)
    }
    return cachedValue
  }

  if (process.env.NODE_ENV !== "production") {
    logger.info(`MISS ${name}`)
  }

  const fetchStartedAt = performance.now()
  const value = await fetcher()

  if (process.env.NODE_ENV !== "production") {
    logger.info(`FETCH ${name} in ${Math.round(performance.now() - fetchStartedAt)}ms`)
  }

  const stored = await safeRedisSet(key, value, ttlSeconds)
  if (stored && process.env.NODE_ENV !== "production") {
    logger.info(`SET ${name} ttl=${ttlSeconds}s`)
  }

  return value
}
