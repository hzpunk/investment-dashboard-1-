import { env } from "@/lib/env"
import { format, subDays, subMonths, subYears, startOfDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"

const CACHE_DURATION = 15 * 60 // 15 minutes
const ALPHA_VANTAGE_DAILY_LIMIT = 500 // Max 500 requests per day for free tier
const ALPHA_VANTAGE_INTERVAL = 15 * 1000 // 15 seconds delay between requests
const COINGECKO_INTERVAL = 5 * 1000 // 5 seconds delay between requests

let lastAlphaVantageRequestTime = 0
let lastCoinGeckoRequestTime = 0

let prismaClient: any = null
async function getPrisma() {
  if (typeof window !== 'undefined') return null
  if (!prismaClient) {
    const prismaModule = await eval("import('@/lib/prisma')")
    prismaClient = prismaModule.prisma
  }
  return prismaClient
}

async function getFromCache(symbol: string, dataType: string) {
  if (typeof window !== 'undefined') return null
  
  try {
    const prisma = await getPrisma()
    if (!prisma) return null
    const now = new Date()
    const row = await prisma.marketDataCache.findFirst({
      where: {
        symbol,
        dataType,
        expiresAt: { gt: now },
      },
      orderBy: { lastUpdated: "desc" },
    })
    return (row?.data as any) ?? null
  } catch {
    return null
  }
}

async function saveToCache(symbol: string, dataType: string, data: any) {
  if (typeof window !== 'undefined') return
  
  try {
    const prisma = await getPrisma()
    if (!prisma) return
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CACHE_DURATION * 1000)

    await prisma.marketDataCache.create({
      data: {
        symbol,
        dataType,
        data,
        lastUpdated: now,
        expiresAt,
      },
    })
  } catch {
    // Ignore cache errors
  }
}

export async function getCryptoPrices(ids: string[]) {
  try {
    const cacheKey = ids.sort().join(",")
    const cachedData = await getFromCache(cacheKey, "crypto_prices")

    if (cachedData) {
      return cachedData
    }

    const apiKey = env.COINGECKO_API_KEY
    const baseUrl = "https://api.coingecko.com/api/v3"
    const endpoint = apiKey
      ? `${baseUrl}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true&x_cg_api_key=${apiKey}`
      : `${baseUrl}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`

    await waitCoinGeckoInterval()
    const response = await fetch(endpoint)

    if (!response.ok) {
      throw new Error(`Failed to fetch crypto prices: ${response.statusText}`)
    }

    const data = await response.json()

    await saveToCache(cacheKey, "crypto_prices", data)

    return data
  } catch (error) {
    console.error("Error in getCryptoPrices:", error)
    return {}
  }
}

export async function getStockPrice(symbol: string) {
  try {
    const cachedData = await getFromCache(symbol, "stock_price")

    if (cachedData) {
      return cachedData
    }

    const apiKey = env.ALPHA_VANTAGE_API_KEY || "demo"
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch stock price: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data["Global Quote"] || Object.keys(data["Global Quote"]).length === 0) {
      throw new Error("Invalid data received from Alpha Vantage")
    }

    await saveToCache(symbol, "stock_price", data)

    return data
  } catch (error) {
    console.error(`Error in getStockPrice for ${symbol}:`, error)
    return {}
  }
}

async function waitAlphaVantageInterval() {
  const now = Date.now()
  const elapsed = now - lastAlphaVantageRequestTime
  if (elapsed < ALPHA_VANTAGE_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, ALPHA_VANTAGE_INTERVAL - elapsed))
  }
  lastAlphaVantageRequestTime = Date.now()
}

async function waitCoinGeckoInterval() {
  const now = Date.now()
  const elapsed = now - lastCoinGeckoRequestTime
  if (elapsed < COINGECKO_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, COINGECKO_INTERVAL - elapsed))
  }
  lastCoinGeckoRequestTime = Date.now()
}

export async function getHistoricalPrices(
  symbol: string,
  type: "stock" | "crypto",
  timeframe: "1M" | "3M" | "6M" | "1Y" | "ALL" = "1M",
) {
  const cacheKey = `${symbol}-${type}-${timeframe}`
  const cachedData = await getFromCache(cacheKey, "historical_prices")
  if (cachedData) {
    return cachedData
  }

  let data: { date: string; value: number }[] = []

  try {
    if (type === "crypto") {
      const coinId = cryptoIdMap[symbol.toUpperCase()] || symbol.toLowerCase()
      let days: number
      switch (timeframe) {
        case "1M": days = 30; break
        case "3M": days = 90; break
        case "6M": days = 180; break
        case "1Y": days = 365; break
        case "ALL": days = 3650; break // ~10 years, CoinGecko free tier limit
        default: days = 30; break
      }
      
      const apiKey = env.COINGECKO_API_KEY
      const baseUrl = "https://api.coingecko.com/api/v3"
      const endpoint = apiKey
        ? `${baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&x_cg_api_key=${apiKey}`
        : `${baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`

      await waitCoinGeckoInterval()
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`Failed to fetch crypto historical prices: ${response.statusText}`)
      }
      const json = await response.json()
      data = (json.prices || []).map((item: [number, number]) => ({
        date: new Date(item[0]).toISOString(),
        value: item[1],
      }))
    } else if (type === "stock") {
      await waitAlphaVantageInterval()
      const apiKey = env.ALPHA_VANTAGE_API_KEY || "demo"
      let functionType = "TIME_SERIES_DAILY_ADJUSTED"
      let outputsize = "compact"

      switch (timeframe) {
        case "1Y": outputsize = "full"; break // For 1 year and ALL, try to get more data
        case "ALL": outputsize = "full"; break
        default: outputsize = "compact"; break
      }

      const response = await fetch(
        `https://www.alphavantage.co/query?function=${functionType}&symbol=${symbol}&outputsize=${outputsize}&apikey=${apiKey}`,
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch stock historical prices: ${response.statusText}`)
      }
      const json = await response.json()

      const timeSeries = json["Time Series (Daily)"]
      if (timeSeries) {
        data = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
          date: new Date(date).toISOString(),
          value: parseFloat(values["5. adjusted close"]),
        })).reverse() // Alpha Vantage returns newest first, we need oldest first

        // Filter data based on timeframe if outputsize was 'full' but we need a specific range
        const endDate = startOfDay(new Date())
        let startDate: Date
        switch (timeframe) {
          case "1M": startDate = subMonths(endDate, 1); break
          case "3M": startDate = subMonths(endDate, 3); break
          case "6M": startDate = subMonths(endDate, 6); break
          case "1Y": startDate = subYears(endDate, 1); break
          case "ALL": startDate = new Date(0); break // Effectively no start date filter
          default: startDate = subMonths(endDate, 1); break
        }

        if (outputsize === "full" && timeframe !== "ALL") {
          data = data.filter(item => new Date(item.date) >= startOfDay(startDate))
        }

      }
    }
    await saveToCache(cacheKey, "historical_prices", data)
    return data
  } catch (error) {
    console.error(`Error in getHistoricalPrices for ${symbol} (${type}, ${timeframe}):`, error)
    return []
  }
}

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