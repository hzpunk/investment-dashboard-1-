// Rate limiting utility using LRU cache
import { LRUCache } from 'lru-cache'

const rateCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 60 * 1000, // 1 minute window
})

const IP_CACHE = new LRUCache<string, number>({
  max: 500,
  ttl: 60 * 1000,
})

export function checkRateLimit(identifier: string, limit = 100): boolean {
  const current = rateCache.get(identifier) || 0
  if (current >= limit) return false
  rateCache.set(identifier, current + 1)
  return true
}

export function checkIpRateLimit(ip: string, limit = 60): boolean {
  const current = IP_CACHE.get(ip) || 0
  if (current >= limit) return false
  IP_CACHE.set(ip, current + 1)
  return true
}
