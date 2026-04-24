// Simple in-memory rate limiting without external dependencies

interface RateEntry {
  count: number
  resetTime: number
}

const rateCache = new Map<string, RateEntry>()
const WINDOW_MS = 60 * 1000 // 1 minute

function getNow(): number {
  return Date.now()
}

function cleanup(): void {
  const now = getNow()
  for (const [key, entry] of rateCache.entries()) {
    if (entry.resetTime < now) {
      rateCache.delete(key)
    }
  }
}

export function checkRateLimit(identifier: string, limit = 100): boolean {
  cleanup()
  
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

// Cleanup every 5 minutes to prevent memory leak
setInterval(cleanup, 5 * 60 * 1000)
