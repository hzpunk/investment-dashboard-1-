import "server-only"

import { cacheKeys } from "@/lib/cache-keys"
import { safeRedisGet, safeRedisSet } from "@/lib/redis"
import { fetchCbrDailyRates } from "@/lib/currency/cbr-client"
import type { CurrencyRatesResult } from "@/lib/currency/types"

const ratesTtlSeconds = 12 * 60 * 60
const memoryCache = new Map<string, { value: CurrencyRatesResult; expiresAt: number }>()

function rateDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export async function getCbrCurrencyRates(date = new Date()): Promise<CurrencyRatesResult | null> {
  const key = cacheKeys.currencyRatesCbr(rateDateKey(date))
  const memoryCached = memoryCache.get(key)
  if (memoryCached && memoryCached.expiresAt > Date.now()) return memoryCached.value

  const cached = await safeRedisGet<CurrencyRatesResult>(key)
  if (cached) {
    rememberRates(key, cached)
    return cached
  }

  try {
    const fresh = await fetchCbrDailyRates(date)
    await safeRedisSet(key, fresh, ratesTtlSeconds)
    rememberRates(key, fresh)
    return fresh
  } catch (error) {
    const stale = await findStaleRates(date)
    if (stale) {
      const staleResult = { ...stale, stale: true }
      rememberRates(key, staleResult)
      return staleResult
    }
    console.error("[Currency] CBR rates unavailable:", error)
    return null
  }
}

async function findStaleRates(date: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const staleDate = new Date(date)
    staleDate.setUTCDate(staleDate.getUTCDate() - offset)
    const staleKey = cacheKeys.currencyRatesCbr(rateDateKey(staleDate))
    const memoryCached = memoryCache.get(staleKey)
    if (memoryCached) return memoryCached.value

    const cached = await safeRedisGet<CurrencyRatesResult>(staleKey)
    if (cached) {
      rememberRates(staleKey, cached)
      return cached
    }
  }
  return null
}

function rememberRates(key: string, value: CurrencyRatesResult) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ratesTtlSeconds * 1000 })
}
