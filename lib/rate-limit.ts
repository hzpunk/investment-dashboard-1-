// Simple in-memory rate limiting without external dependencies

interface RateEntry {
  count: number
  resetTime: number
}

const rateCache = new Map<string, RateEntry>()
const IP_CACHE = new Map<string, RateEntry>()
const WINDOW_MS = 60 * 1000 // 1 minute

function getNow(): number {
  return Date.now()
}

function cleanup(cache: Map<string, RateEntry>): void {
  const now = getNow()
  for (const [key, entry] of cache.entries()) {
    if (entry.resetTime < now) {
      cache.delete(key)
    }
  }
}

export function checkRateLimit(identifier: string, limit = 100): boolean {
  cleanup(rateCache)
  
  const now = getNow()
  const entry = rateCache.get(identifier)
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    rateCache.set(identifier, {
      count: 1,
      resetTime: now + WINDOW_MS,
    })
    return true
  }
  
  if (entry.count >= limit) {
    return false
  }
  
  entry.count++
  return true
}

export function checkIpRateLimit(ip: string, limit = 60): boolean {
  cleanup(IP_CACHE)
  
  const now = getNow()
  const entry = IP_CACHE.get(ip)
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    IP_CACHE.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    })
    return true
  }
  
  if (entry.count >= limit) {
    return false
  }
  
  entry.count++
  return true
}

// Cleanup every 5 minutes to prevent memory leak
setInterval(() => {
  cleanup(rateCache)
  cleanup(IP_CACHE)
}, 5 * 60 * 1000)
