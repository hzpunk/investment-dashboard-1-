export type MarketDataSource = "provider" | "cache" | "fallback"

export type MarketDataResult<T> = {
  success: boolean
  data: T
  source: MarketDataSource
  warning?: string
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

async function apiFetch<T>(url: string): Promise<MarketDataResult<T>> {
  try {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    })
    const data = await response.json().catch(() => null)

    if (!response.ok || !data) {
      return {
        success: false,
        data: null as T,
        source: "fallback",
        warning: "market_data_unavailable",
      }
    }

    return data as MarketDataResult<T>
  } catch {
    return {
      success: false,
      data: null as T,
      source: "fallback",
      warning: "market_data_unavailable",
    }
  }
}

export async function getCryptoPricesResult(ids: string[]) {
  const query = new URLSearchParams({ ids: ids.join(",") })
  return apiFetch<Record<string, { usd: number; usd_24h_change: number }>>(`/api/market/crypto-prices?${query.toString()}`)
}

export async function getCryptoPrices(ids: string[]) {
  const result = await getCryptoPricesResult(ids)
  return result.data ?? {}
}

export async function getHistoricalPricesResult(
  symbol: string,
  type: "stock" | "crypto",
  timeframe: "1M" | "3M" | "6M" | "1Y" | "ALL" = "1M",
) {
  const query = new URLSearchParams({ symbol, type, period: timeframe })
  return apiFetch<Array<{ date: string; value: number }>>(`/api/market/historical-prices?${query.toString()}`)
}

export async function getHistoricalPrices(
  symbol: string,
  type: "stock" | "crypto",
  timeframe: "1M" | "3M" | "6M" | "1Y" | "ALL" = "1M",
) {
  const result = await getHistoricalPricesResult(symbol, type, timeframe)
  return result.data ?? []
}
