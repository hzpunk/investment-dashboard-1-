import { prisma } from "@/lib/prisma"
import { invalidateAllUsersDerivedFinancialCache, invalidateMarketCache } from "@/lib/cache-invalidation"
import { createLogger } from "@/lib/logger"
import { cryptoIdMap, getCryptoPricesServer, getStockPriceServer } from "@/lib/services/market-data"

const logger = createLogger("UpdateAssetPricesService")

export type UpdateAssetPricesResult = {
  total: number
  updated: number
  skipped: number
  errors: Array<{ symbol: string; error: string }>
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function parseStockPrice(data: any): number | null {
  const rawPrice = data?.["Global Quote"]?.["05. price"]
  const price = typeof rawPrice === "string" ? Number.parseFloat(rawPrice) : rawPrice
  return isPositiveFiniteNumber(price) ? price : null
}

function parseCryptoPrice(data: any, coinId: string): number | null {
  const price = data?.[coinId]?.usd
  return isPositiveFiniteNumber(price) ? price : null
}

async function updateAssetPrice(assetId: string, currentPrice: number, nextPrice: number) {
  if (currentPrice === nextPrice) {
    return false
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: { currentPrice: nextPrice },
  })

  return true
}

export async function updateAssetPricesService(): Promise<UpdateAssetPricesResult> {
  const assets = await prisma.asset.findMany({
    select: {
      id: true,
      symbol: true,
      type: true,
      currentPrice: true,
    },
    orderBy: { symbol: "asc" },
  })

  const result: UpdateAssetPricesResult = {
    total: assets.length,
    updated: 0,
    skipped: 0,
    errors: [],
  }
  const updatedSymbols = new Set<string>()

  if (assets.length === 0) {
    return result
  }

  const cryptoAssets = assets.filter((asset) => asset.type === "crypto")
  const cryptoIdsByAssetId = new Map<string, string>()
  for (const asset of cryptoAssets) {
    const coinId = cryptoIdMap[asset.symbol.toUpperCase()]
    if (coinId) {
      cryptoIdsByAssetId.set(asset.id, coinId)
    }
  }

  let cryptoPrices: any = {}
  const cryptoIds = Array.from(new Set(cryptoIdsByAssetId.values()))
  if (cryptoIds.length > 0) {
    cryptoPrices = (await getCryptoPricesServer(cryptoIds)).data
  }

  for (const asset of assets) {
    try {
      let nextPrice: number | null = null

      if (asset.type === "crypto") {
        const coinId = cryptoIdsByAssetId.get(asset.id)
        if (!coinId) {
          result.skipped += 1
          continue
        }
        nextPrice = parseCryptoPrice(cryptoPrices, coinId)
      } else if (asset.type === "stock" || asset.type === "etf") {
        if (!process.env.ALPHA_VANTAGE_API_KEY) {
          result.skipped += 1
          continue
        }
        nextPrice = parseStockPrice((await getStockPriceServer(asset.symbol)).data)
      } else {
        result.skipped += 1
        continue
      }

      if (!isPositiveFiniteNumber(nextPrice)) {
        result.skipped += 1
        continue
      }

      const wasUpdated = await updateAssetPrice(asset.id, asset.currentPrice, nextPrice)
      if (wasUpdated) {
        result.updated += 1
        updatedSymbols.add(asset.symbol)
      } else {
        result.skipped += 1
      }
    } catch (error) {
      result.errors.push({
        symbol: asset.symbol,
        error: error instanceof Error ? error.message : "Unknown price update error",
      })
    }
  }

  if (result.updated > 0 || result.errors.length > 0) {
    logger.info("Asset price update completed", result)
  }

  if (updatedSymbols.size > 0) {
    await Promise.all([
      ...Array.from(updatedSymbols).map((symbol) => invalidateMarketCache(symbol)),
      invalidateAllUsersDerivedFinancialCache(),
    ])
  }

  return result
}
