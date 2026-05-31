import "server-only"

import { prisma } from "@/lib/prisma"
import { cryptoIdMap, getCryptoPricesServer } from "@/lib/services/market-data"
import { getPortfolioSummary } from "@/lib/services/portfolio-summary"

const MAX_HOLDINGS_IN_CONTEXT = 25
const MAX_TRANSACTIONS_IN_CONTEXT = 10
const CRYPTO_PRICE_FRESH_MS = 15 * 60 * 1000

type ContextStatus = "available" | "partial" | "empty" | "unavailable"

export type AIContextStatus = {
  portfolio: ContextStatus
  accounts: ContextStatus
  marketData: ContextStatus
}

type HoldingContext = {
  symbol: string
  name: string
  type: string
  quantity: number
  averagePrice: number | null
  currentPrice: number | null
  currentPriceUpdatedAt: string | null
  value: number
  pnl: number | null
  pnlPercent: number | null
  currency: string
}

export type AIPortfolioContext = {
  generatedAt: string
  dataAvailability: {
    accounts: ContextStatus
    holdings: ContextStatus
    recentTransactions: ContextStatus
    marketData: ContextStatus
    notes: string[]
  }
  accounts: Array<{
    id: string
    name: string
    type: string
    balance: number
    currency: string
  }>
  portfolioSummary: {
    totalValue: number
    currency: string
    cashBalances: Array<{ currency: string; balance: number }>
    totalPnL: number | null
    totalPnLPercent: number | null
    allocationByAssetType: Array<{ type: string; value: number; percent: number }>
    allocationByCurrency: Array<{ currency: string; value: number; percent: number }>
    allocationBySector: "not_available"
    source: string
  }
  holdings: HoldingContext[]
  recentTransactions: Array<{
    date: string
    type: string
    symbol: string | null
    assetName: string | null
    quantity: number | null
    price: number | null
    amount: number
    currency: string
  }>
  marketData: Record<
    string,
    | {
        status: "available"
        price: number
        currency: string
        source: "provider_or_cache" | "database_asset"
        updatedAt: string
      }
    | {
        status: "stale"
        price: null
        lastKnownPrice: number
        currency: string
        source: "database_asset"
        updatedAt: string
        note: string
      }
    | {
        status: "unavailable"
        price: null
        currency: "USD"
        note: string
      }
  >
  riskSignals: Array<{
    type: string
    severity: "info" | "warning"
    message: string
  }>
}

function roundNumber(value: number | null | undefined, digits = 2): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Number(value.toFixed(digits))
}

function getSingleCurrency(currencies: string[]) {
  const unique = Array.from(new Set(currencies.filter(Boolean)))
  return unique.length === 1 ? unique[0] : "mixed"
}

function groupCurrencyBalances(accounts: Array<{ balance: number; currency: string }>) {
  const grouped = new Map<string, number>()
  for (const account of accounts) {
    grouped.set(account.currency, (grouped.get(account.currency) ?? 0) + account.balance)
  }

  return Array.from(grouped.entries())
    .map(([currency, balance]) => ({ currency, balance: roundNumber(balance) ?? 0 }))
    .sort((a, b) => b.balance - a.balance)
}

function getCostBasis(
  transactions: Array<{
    assetId: string | null
    type: string
    quantity: number | null
    totalAmount: number
    fee: number
  }>,
) {
  const byAsset = new Map<string, { quantity: number; cost: number }>()

  for (const transaction of transactions) {
    if (!transaction.assetId) continue

    const quantity = transaction.quantity ?? 0
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    const current = byAsset.get(transaction.assetId) ?? { quantity: 0, cost: 0 }

    if (transaction.type === "buy") {
      current.quantity += quantity
      current.cost += transaction.totalAmount + transaction.fee
    }

    if (transaction.type === "sell" && current.quantity > 0) {
      const soldRatio = Math.min(quantity / current.quantity, 1)
      current.cost *= 1 - soldRatio
      current.quantity = Math.max(current.quantity - quantity, 0)
    }

    byAsset.set(transaction.assetId, current)
  }

  return byAsset
}

function isFresh(updatedAt: Date) {
  return Date.now() - updatedAt.getTime() <= CRYPTO_PRICE_FRESH_MS
}

function detectRelevantCryptoSymbols(message: string, holdings: HoldingContext[]) {
  const symbols = new Set<string>()
  const normalized = message.toLowerCase()

  if (/\bbtc\b|bitcoin|биткоин|биткоина|биткойн/.test(normalized)) {
    symbols.add("BTC")
  }

  for (const holding of holdings) {
    if (holding.type === "crypto" && cryptoIdMap[holding.symbol.toUpperCase()]) {
      symbols.add(holding.symbol.toUpperCase())
    }
  }

  return Array.from(symbols).slice(0, 8)
}

async function buildMarketData(message: string, holdings: HoldingContext[]) {
  const symbols = detectRelevantCryptoSymbols(message, holdings)
  if (symbols.length === 0) return {}

  const ids = symbols.map((symbol) => cryptoIdMap[symbol] ?? symbol.toLowerCase())
  const [priceResult, dbAssets] = await Promise.all([
    getCryptoPricesServer(ids),
    prisma.asset.findMany({
      where: { symbol: { in: symbols } },
      select: {
        symbol: true,
        currentPrice: true,
        currency: true,
        updatedAt: true,
      },
    }),
  ])

  const assetsBySymbol = new Map(dbAssets.map((asset) => [asset.symbol.toUpperCase(), asset]))
  const marketData: AIPortfolioContext["marketData"] = {}

  for (const symbol of symbols) {
    const id = cryptoIdMap[symbol] ?? symbol.toLowerCase()
    const providerPrice = priceResult.success ? priceResult.data[id]?.usd : undefined

    if (typeof providerPrice === "number" && Number.isFinite(providerPrice) && providerPrice > 0) {
      marketData[symbol] = {
        status: "available",
        price: roundNumber(providerPrice) ?? providerPrice,
        currency: "USD",
        source: "provider_or_cache",
        updatedAt: new Date().toISOString(),
      }
      continue
    }

    const dbAsset = assetsBySymbol.get(symbol)
    if (dbAsset && Number.isFinite(dbAsset.currentPrice) && dbAsset.currentPrice > 0) {
      if (isFresh(dbAsset.updatedAt)) {
        marketData[symbol] = {
          status: "available",
          price: roundNumber(dbAsset.currentPrice) ?? dbAsset.currentPrice,
          currency: dbAsset.currency,
          source: "database_asset",
          updatedAt: dbAsset.updatedAt.toISOString(),
        }
      } else {
        marketData[symbol] = {
          status: "stale",
          price: null,
          lastKnownPrice: roundNumber(dbAsset.currentPrice) ?? dbAsset.currentPrice,
          currency: dbAsset.currency,
          source: "database_asset",
          updatedAt: dbAsset.updatedAt.toISOString(),
          note: "Last known database price is stale; do not present it as a current market price.",
        }
      }
      continue
    }

    marketData[symbol] = {
      status: "unavailable",
      price: null,
      currency: "USD",
      note: "No current provider, cache, or database price is available.",
    }
  }

  return marketData
}

function buildRiskSignals(holdings: HoldingContext[], totalValue: number) {
  const signals: AIPortfolioContext["riskSignals"] = []
  if (totalValue <= 0 || holdings.length === 0) return signals

  const [largestHolding] = holdings
  const largestPercent = largestHolding ? (largestHolding.value / totalValue) * 100 : 0
  if (largestHolding && largestPercent >= 35) {
    signals.push({
      type: "concentration",
      severity: "warning",
      message: `${largestHolding.symbol} занимает около ${largestPercent.toFixed(1)}% портфеля; стоит проверить концентрационный риск.`,
    })
  }

  const cryptoValue = holdings
    .filter((holding) => holding.type === "crypto")
    .reduce((sum, holding) => sum + holding.value, 0)
  const cryptoPercent = (cryptoValue / totalValue) * 100
  if (cryptoPercent >= 20) {
    signals.push({
      type: "crypto_exposure",
      severity: "warning",
      message: `Криптоактивы занимают около ${cryptoPercent.toFixed(1)}% портфеля; это может повышать волатильность.`,
    })
  }

  const stalePriceCount = holdings.filter((holding) => {
    if (!holding.currentPriceUpdatedAt) return true
    return Date.now() - new Date(holding.currentPriceUpdatedAt).getTime() > 24 * 60 * 60 * 1000
  }).length

  if (stalePriceCount > 0) {
    signals.push({
      type: "stale_prices",
      severity: "info",
      message: `У ${stalePriceCount} позиций цена может быть неактуальной; перед выводами стоит обновить рыночные данные.`,
    })
  }

  return signals
}

export async function buildAIPortfolioContext(userId: string, userMessage: string): Promise<AIPortfolioContext> {
  const [accounts, portfolioSummary, portfolioAssets, recentTransactions, costTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, balance: true, currency: true },
      orderBy: { createdAt: "desc" },
    }),
    getPortfolioSummary(userId),
    prisma.portfolioAsset.findMany({
      where: { portfolio: { userId } },
      select: {
        assetId: true,
        quantity: true,
        averageBuyPrice: true,
        asset: {
          select: {
            symbol: true,
            name: true,
            type: true,
            currentPrice: true,
            currency: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: MAX_TRANSACTIONS_IN_CONTEXT,
      select: {
        date: true,
        type: true,
        quantity: true,
        pricePerUnit: true,
        totalAmount: true,
        currency: true,
        asset: { select: { symbol: true, name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["buy", "sell"] },
        assetId: { not: null },
      },
      orderBy: { date: "asc" },
      take: 2000,
      select: {
        assetId: true,
        type: true,
        quantity: true,
        totalAmount: true,
        fee: true,
        asset: {
          select: {
            symbol: true,
            name: true,
            type: true,
            currentPrice: true,
            currency: true,
            updatedAt: true,
          },
        },
      },
    }),
  ])

  const costBasis = getCostBasis(costTransactions)
  const assetMetaById = new Map<string, NonNullable<(typeof costTransactions)[number]["asset"]>>()
  for (const transaction of costTransactions) {
    if (transaction.assetId && transaction.asset) {
      assetMetaById.set(transaction.assetId, transaction.asset)
    }
  }

  const portfolioAssetById = new Map<
    string,
    {
      assetId: string
      quantity: number
      weightedAverageTotal: number
      asset: (typeof portfolioAssets)[number]["asset"]
    }
  >()

  for (const item of portfolioAssets) {
    const current = portfolioAssetById.get(item.assetId) ?? {
      assetId: item.assetId,
      quantity: 0,
      weightedAverageTotal: 0,
      asset: item.asset,
    }
    current.quantity += item.quantity
    current.weightedAverageTotal += item.averageBuyPrice * item.quantity
    current.asset = item.asset
    portfolioAssetById.set(item.assetId, current)
  }

  const holdingsByAsset = new Map<string, HoldingContext>()

  for (const item of portfolioAssetById.values()) {
    const averagePrice = item.quantity > 0 ? item.weightedAverageTotal / item.quantity : null
    const value = item.quantity * item.asset.currentPrice
    const pnl = averagePrice !== null ? value - item.quantity * averagePrice : null
    const cost = averagePrice !== null ? item.quantity * averagePrice : null

    holdingsByAsset.set(item.assetId, {
      symbol: item.asset.symbol,
      name: item.asset.name,
      type: item.asset.type,
      quantity: roundNumber(item.quantity, 6) ?? item.quantity,
      averagePrice: roundNumber(averagePrice),
      currentPrice: roundNumber(item.asset.currentPrice),
      currentPriceUpdatedAt: item.asset.updatedAt.toISOString(),
      value: roundNumber(value) ?? value,
      pnl: roundNumber(pnl),
      pnlPercent: cost && cost > 0 && pnl !== null ? roundNumber((pnl / cost) * 100) : null,
      currency: item.asset.currency,
    })
  }

  for (const summaryHolding of portfolioSummary.holdings) {
    if (holdingsByAsset.has(summaryHolding.assetId)) continue

    const meta = assetMetaById.get(summaryHolding.assetId)
    const basis = costBasis.get(summaryHolding.assetId)
    const averagePrice = basis && basis.quantity > 0 ? basis.cost / basis.quantity : null
    const pnl = averagePrice !== null ? summaryHolding.value - summaryHolding.quantity * averagePrice : null
    const cost = averagePrice !== null ? summaryHolding.quantity * averagePrice : null

    holdingsByAsset.set(summaryHolding.assetId, {
      symbol: summaryHolding.symbol,
      name: summaryHolding.name,
      type: summaryHolding.type,
      quantity: roundNumber(summaryHolding.quantity, 6) ?? summaryHolding.quantity,
      averagePrice: roundNumber(averagePrice),
      currentPrice: roundNumber(summaryHolding.currentPrice),
      currentPriceUpdatedAt: meta?.updatedAt.toISOString() ?? null,
      value: roundNumber(summaryHolding.value) ?? summaryHolding.value,
      pnl: roundNumber(pnl),
      pnlPercent: cost && cost > 0 && pnl !== null ? roundNumber((pnl / cost) * 100) : null,
      currency: meta?.currency ?? "USD",
    })
  }

  const holdings = Array.from(holdingsByAsset.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_HOLDINGS_IN_CONTEXT)

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0)
  const allocationByAssetType = Array.from(
    holdings.reduce<Map<string, number>>((map, holding) => {
      map.set(holding.type, (map.get(holding.type) ?? 0) + holding.value)
      return map
    }, new Map()),
  )
    .map(([type, value]) => ({
      type,
      value: roundNumber(value) ?? value,
      percent: totalValue > 0 ? roundNumber((value / totalValue) * 100) ?? 0 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const allocationByCurrency = Array.from(
    holdings.reduce<Map<string, number>>((map, holding) => {
      map.set(holding.currency, (map.get(holding.currency) ?? 0) + holding.value)
      return map
    }, new Map()),
  )
    .map(([currency, value]) => ({
      currency,
      value: roundNumber(value) ?? value,
      percent: totalValue > 0 ? roundNumber((value / totalValue) * 100) ?? 0 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const knownPnlHoldings = holdings.filter((holding) => holding.pnl !== null)
  const totalPnL =
    knownPnlHoldings.length > 0 ? knownPnlHoldings.reduce((sum, holding) => sum + (holding.pnl ?? 0), 0) : null
  const totalCost =
    knownPnlHoldings.length > 0
      ? knownPnlHoldings.reduce((sum, holding) => sum + holding.value - (holding.pnl ?? 0), 0)
      : null

  const marketData = await buildMarketData(userMessage, holdings)
  const marketStatuses = Object.values(marketData).map((item) => item.status)
  const marketDataStatus: ContextStatus =
    marketStatuses.length === 0
      ? "unavailable"
      : marketStatuses.every((status) => status === "available")
        ? "available"
        : marketStatuses.some((status) => status === "available")
          ? "partial"
          : "unavailable"

  const notes: string[] = []
  if (holdings.length === 0) {
    notes.push("No portfolio holdings were found for this user.")
  }
  if (accounts.length === 0) {
    notes.push("No accounts were found for this user.")
  }
  if (marketDataStatus !== "available") {
    notes.push("Some requested or relevant market prices are missing or stale; do not invent current prices.")
  }

  return {
    generatedAt: new Date().toISOString(),
    dataAvailability: {
      accounts: accounts.length > 0 ? "available" : "empty",
      holdings: holdings.length > 0 ? "available" : "empty",
      recentTransactions: recentTransactions.length > 0 ? "available" : "empty",
      marketData: marketDataStatus,
      notes,
    },
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: roundNumber(account.balance) ?? account.balance,
      currency: account.currency,
    })),
    portfolioSummary: {
      totalValue: roundNumber(totalValue) ?? totalValue,
      currency: getSingleCurrency(holdings.map((holding) => holding.currency)),
      cashBalances: groupCurrencyBalances(accounts),
      totalPnL: roundNumber(totalPnL),
      totalPnLPercent: totalCost && totalCost > 0 && totalPnL !== null ? roundNumber((totalPnL / totalCost) * 100) : null,
      allocationByAssetType,
      allocationByCurrency,
      allocationBySector: "not_available",
      source: portfolioSummary.source,
    },
    holdings,
    recentTransactions: recentTransactions.map((transaction) => ({
      date: transaction.date.toISOString(),
      type: transaction.type,
      symbol: transaction.asset?.symbol ?? null,
      assetName: transaction.asset?.name ?? null,
      quantity: roundNumber(transaction.quantity, 6),
      price: roundNumber(transaction.pricePerUnit),
      amount: roundNumber(transaction.totalAmount) ?? transaction.totalAmount,
      currency: transaction.currency,
    })),
    marketData,
    riskSignals: buildRiskSignals(holdings, totalValue),
  }
}

export function getAIContextStatus(context: AIPortfolioContext): AIContextStatus {
  return {
    portfolio: context.dataAvailability.holdings,
    accounts: context.dataAvailability.accounts,
    marketData: context.dataAvailability.marketData,
  }
}
