import "server-only"

import { env } from "@/lib/env"
import { cacheKeys, shortHash } from "@/lib/cache-keys"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"
import { safeRedisGet, safeRedisSet } from "@/lib/redis"

const logger = createLogger("MarketDataService")

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
const CRYPTO_PRICE_TTL_MS = 60 * 1000
const HISTORICAL_TTL_MS = 45 * 60 * 1000
const STOCK_PRICE_TTL_MS = 15 * 60 * 1000
const PROVIDER_TIMEOUT_MS = 5000
const CRYPTO_PRICE_TTL_SECONDS = CRYPTO_PRICE_TTL_MS / 1000
const HISTORICAL_TTL_SECONDS = HISTORICAL_TTL_MS / 1000
const STOCK_PRICE_TTL_SECONDS = STOCK_PRICE_TTL_MS / 1000

type MarketSource = "provider" | "cache" | "fallback"

export type MarketResult<T> = {
  success: boolean
  data: T
  source: MarketSource
  warning?: string
}

type CacheEntry<T> = {
  expiresAt: number
  data: T
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

export const cryptoIdMap: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
}

const fallbackCryptoPrices: Record<string, { usd: number; usd_24h_change: number }> = {
  bitcoin: { usd: 68000, usd_24h_change: 0 },
  ethereum: { usd: 3500, usd_24h_change: 0 },
  binancecoin: { usd: 600, usd_24h_change: 0 },
  solana: { usd: 150, usd_24h_change: 0 },
  ripple: { usd: 0.55, usd_24h_change: 0 },
  cardano: { usd: 0.45, usd_24h_change: 0 },
  dogecoin: { usd: 0.14, usd_24h_change: 0 },
  polkadot: { usd: 7, usd_24h_change: 0 },
  "avalanche-2": { usd: 35, usd_24h_change: 0 },
  "matic-network": { usd: 0.75, usd_24h_change: 0 },
}

function normalizeIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean))).sort()
}

function timeframeDays(timeframe: string) {
  switch (timeframe) {
    case "3M":
      return 90
    case "6M":
      return 180
    case "1Y":
      return 365
    case "ALL":
      return 3650
    case "1M":
    default:
      return 30
  }
}

function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

function setMemoryCache<T>(key: string, data: T, ttlMs: number) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

async function getPersistentCache<T>(symbol: string, dataType: string): Promise<T | null> {
  try {
    const row = await prisma.marketDataCache.findFirst({
      where: {
        symbol,
        dataType,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUpdated: "desc" },
    })
    return (row?.data as T | undefined) ?? null
  } catch {
    return null
  }
}

async function setPersistentCache(symbol: string, dataType: string, data: unknown, ttlMs: number) {
  try {
    const now = new Date()
    await prisma.marketDataCache.create({
      data: {
        symbol,
        dataType,
        data: data as any,
        lastUpdated: now,
        expiresAt: new Date(now.getTime() + ttlMs),
      },
    })
  } catch {
    // Cache failures should never affect page rendering.
  }
}

async function fetchJson(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    })
    if (!response.ok) {
      return { ok: false as const, status: response.status, data: null }
    }
    return { ok: true as const, status: response.status, data: await response.json() }
  } catch {
    return { ok: false as const, status: 0, data: null }
  } finally {
    clearTimeout(timeout)
  }
}

function cryptoPriceFallback(ids: string[]) {
  return ids.reduce<Record<string, { usd: number; usd_24h_change: number }>>((acc, id) => {
    acc[id] = fallbackCryptoPrices[id] ?? { usd: 0, usd_24h_change: 0 }
    return acc
  }, {})
}

function historicalFallback(symbol: string, timeframe: string) {
  const days = Math.min(timeframeDays(timeframe), 365)
  const base = fallbackCryptoPrices[cryptoIdMap[symbol.toUpperCase()] ?? symbol.toLowerCase()]?.usd ?? 100
  const points = Math.max(7, Math.min(days, 90))
  const step = days / points
  const now = Date.now()

  return Array.from({ length: points }, (_, index) => {
    const ratio = index / Math.max(points - 1, 1)
    const drift = 1 + (ratio - 0.5) * 0.08
    return {
      date: new Date(now - (points - 1 - index) * step * 24 * 60 * 60 * 1000).toISOString(),
      value: Number((base * drift).toFixed(2)),
    }
  })
}

export async function getCryptoPricesServer(ids: string[]): Promise<MarketResult<Record<string, { usd: number; usd_24h_change: number }>>> {
  const normalizedIds = normalizeIds(ids)
  const symbolsKey = normalizedIds.join(",")
  const cacheKey = shortHash(symbolsKey)
  const redisKey = cacheKeys.marketCryptoPrices(cacheKey)
  const memoryKey = `crypto_prices:${symbolsKey}`

  if (normalizedIds.length === 0) {
    return { success: true, data: {}, source: "fallback" }
  }

  const memoryData = getMemoryCache<Record<string, { usd: number; usd_24h_change: number }>>(memoryKey)
  if (memoryData) {
    return { success: true, data: memoryData, source: "cache" }
  }

  const redisData = await safeRedisGet<Record<string, { usd: number; usd_24h_change: number }>>(redisKey)
  if (redisData) {
    setMemoryCache(memoryKey, redisData, CRYPTO_PRICE_TTL_MS)
    return { success: true, data: redisData, source: "cache" }
  }

  const cachedData = await getPersistentCache<Record<string, { usd: number; usd_24h_change: number }>>(symbolsKey, "crypto_prices")
  if (cachedData) {
    setMemoryCache(memoryKey, cachedData, CRYPTO_PRICE_TTL_MS)
    await safeRedisSet(redisKey, cachedData, CRYPTO_PRICE_TTL_SECONDS)
    return { success: true, data: cachedData, source: "cache" }
  }

  const query = new URLSearchParams({
    ids: normalizedIds.join(","),
    vs_currencies: "usd",
    include_24hr_change: "true",
  })
  if (env.COINGECKO_API_KEY) query.set("x_cg_api_key", env.COINGECKO_API_KEY)

  const providerResult = await fetchJson(`${COINGECKO_BASE_URL}/simple/price?${query.toString()}`)
  if (providerResult.ok && providerResult.data && typeof providerResult.data === "object") {
    const data = providerResult.data as Record<string, { usd: number; usd_24h_change: number }>
    setMemoryCache(memoryKey, data, CRYPTO_PRICE_TTL_MS)
    await Promise.all([
      safeRedisSet(redisKey, data, CRYPTO_PRICE_TTL_SECONDS),
      setPersistentCache(symbolsKey, "crypto_prices", data, CRYPTO_PRICE_TTL_MS),
    ])
    return { success: true, data, source: "provider" }
  }

  logger.warn("CoinGecko crypto prices unavailable", { status: providerResult.status })
  const fallback = cryptoPriceFallback(normalizedIds)
  setMemoryCache(memoryKey, fallback, CRYPTO_PRICE_TTL_MS)
  return { success: false, data: fallback, source: "fallback", warning: "market_data_unavailable" }
}

export async function getHistoricalPricesServer(
  symbol: string,
  type: "stock" | "crypto",
  timeframe: "1M" | "3M" | "6M" | "1Y" | "ALL" = "1M",
): Promise<MarketResult<Array<{ date: string; value: number }>>> {
  const normalizedSymbol = symbol.trim().toUpperCase()
  const cacheKey = `${normalizedSymbol}:${type}:${timeframe}`
  const redisKey = cacheKeys.marketHistoricalPrices(normalizedSymbol, type, timeframe)
  const memoryKey = `historical_prices:${cacheKey}`

  const memoryData = getMemoryCache<Array<{ date: string; value: number }>>(memoryKey)
  if (memoryData) {
    return { success: true, data: memoryData, source: "cache" }
  }

  const redisData = await safeRedisGet<Array<{ date: string; value: number }>>(redisKey)
  if (redisData) {
    setMemoryCache(memoryKey, redisData, HISTORICAL_TTL_MS)
    return { success: true, data: redisData, source: "cache" }
  }

  const cachedData = await getPersistentCache<Array<{ date: string; value: number }>>(cacheKey, "historical_prices")
  if (cachedData) {
    setMemoryCache(memoryKey, cachedData, HISTORICAL_TTL_MS)
    await safeRedisSet(redisKey, cachedData, HISTORICAL_TTL_SECONDS)
    return { success: true, data: cachedData, source: "cache" }
  }

  if (type === "crypto") {
    const coinId = cryptoIdMap[normalizedSymbol] ?? normalizedSymbol.toLowerCase()
    const query = new URLSearchParams({
      vs_currency: "usd",
      days: String(timeframeDays(timeframe)),
    })
    if (env.COINGECKO_API_KEY) query.set("x_cg_api_key", env.COINGECKO_API_KEY)

    const providerResult = await fetchJson(`${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?${query.toString()}`)
    const prices = providerResult.ok ? (providerResult.data as { prices?: [number, number][] } | null)?.prices : null

    if (Array.isArray(prices) && prices.length > 0) {
      const data = prices.map((item) => ({
        date: new Date(item[0]).toISOString(),
        value: item[1],
      }))
      setMemoryCache(memoryKey, data, HISTORICAL_TTL_MS)
      await Promise.all([
        safeRedisSet(redisKey, data, HISTORICAL_TTL_SECONDS),
        setPersistentCache(cacheKey, "historical_prices", data, HISTORICAL_TTL_MS),
      ])
      return { success: true, data, source: "provider" }
    }

    logger.warn("CoinGecko historical prices unavailable", { symbol: normalizedSymbol, status: providerResult.status })
  }

  const fallback = historicalFallback(normalizedSymbol, timeframe)
  setMemoryCache(memoryKey, fallback, HISTORICAL_TTL_MS)
  return { success: false, data: fallback, source: "fallback", warning: "market_data_unavailable" }
}

export async function getStockPriceServer(symbol: string): Promise<MarketResult<any>> {
  const normalizedSymbol = symbol.trim().toUpperCase()
  const cacheKey = `stock_price:${normalizedSymbol}`
  const redisKey = cacheKeys.marketStockPrice(normalizedSymbol)

  const memoryData = getMemoryCache<any>(cacheKey)
  if (memoryData) {
    return { success: true, data: memoryData, source: "cache" }
  }

  const redisData = await safeRedisGet<any>(redisKey)
  if (redisData) {
    setMemoryCache(cacheKey, redisData, STOCK_PRICE_TTL_MS)
    return { success: true, data: redisData, source: "cache" }
  }

  const cachedData = await getPersistentCache<any>(normalizedSymbol, "stock_price")
  if (cachedData) {
    setMemoryCache(cacheKey, cachedData, STOCK_PRICE_TTL_MS)
    await safeRedisSet(redisKey, cachedData, STOCK_PRICE_TTL_SECONDS)
    return { success: true, data: cachedData, source: "cache" }
  }

  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    return { success: false, data: {}, source: "fallback", warning: "market_data_unavailable" }
  }

  const query = new URLSearchParams({
    function: "GLOBAL_QUOTE",
    symbol: normalizedSymbol,
    apikey: process.env.ALPHA_VANTAGE_API_KEY,
  })
  const providerResult = await fetchJson(`https://www.alphavantage.co/query?${query.toString()}`)
  if (providerResult.ok && providerResult.data) {
    setMemoryCache(cacheKey, providerResult.data, STOCK_PRICE_TTL_MS)
    await Promise.all([
      safeRedisSet(redisKey, providerResult.data, STOCK_PRICE_TTL_SECONDS),
      setPersistentCache(normalizedSymbol, "stock_price", providerResult.data, STOCK_PRICE_TTL_MS),
    ])
    return { success: true, data: providerResult.data, source: "provider" }
  }

  return { success: false, data: {}, source: "fallback", warning: "market_data_unavailable" }
}
