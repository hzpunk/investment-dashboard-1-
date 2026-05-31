import "server-only"

import { cacheKeys } from "@/lib/cache-keys"
import { prisma } from "@/lib/prisma"
import { cached } from "@/lib/server-cache"

export type AllocationType = "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"

export type PortfolioAllocationItem = {
  type: AllocationType
  value: number
}

export type PortfolioHoldingItem = {
  assetId: string
  symbol: string
  name: string
  type: AllocationType
  quantity: number
  currentPrice: number
  value: number
}

export type PortfolioSummary = {
  totalValue: number
  allocation: PortfolioAllocationItem[]
  holdings: PortfolioHoldingItem[]
  source: "portfolio_assets" | "transactions" | "mixed" | "empty"
}

const validTypes = new Set<AllocationType>(["stock", "bond", "etf", "crypto", "commodity", "other"])

function normalizeAssetType(type: string): AllocationType {
  return validTypes.has(type as AllocationType) ? (type as AllocationType) : "other"
}

function buildSummary(holdings: PortfolioHoldingItem[], source: PortfolioSummary["source"]): PortfolioSummary {
  const allocationByType = new Map<AllocationType, number>()

  for (const holding of holdings) {
    if (!Number.isFinite(holding.value) || holding.value <= 0) continue
    allocationByType.set(holding.type, (allocationByType.get(holding.type) ?? 0) + holding.value)
  }

  const allocation = Array.from(allocationByType.entries())
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value)

  return {
    totalValue: allocation.reduce((sum, item) => sum + item.value, 0),
    allocation,
    holdings: holdings.filter((holding) => holding.value > 0).sort((a, b) => b.value - a.value),
    source,
  }
}

async function getPortfolioAssetHoldings(userId: string): Promise<PortfolioHoldingItem[]> {
  const portfolioAssets = await prisma.portfolioAsset.findMany({
    where: {
      portfolio: { userId },
      quantity: { gt: 0 },
    },
    select: {
      assetId: true,
      quantity: true,
      asset: {
        select: {
          symbol: true,
          name: true,
          type: true,
          currentPrice: true,
        },
      },
    },
  })

  return portfolioAssets.map((item) => ({
    assetId: item.assetId,
    symbol: item.asset.symbol,
    name: item.asset.name,
    type: normalizeAssetType(item.asset.type),
    quantity: item.quantity,
    currentPrice: item.asset.currentPrice,
    value: item.quantity * item.asset.currentPrice,
  }))
}

async function getTransactionDerivedHoldings(userId: string): Promise<PortfolioHoldingItem[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ["buy", "sell"] },
      assetId: { not: null },
    },
    select: {
      assetId: true,
      type: true,
      quantity: true,
      asset: {
        select: {
          symbol: true,
          name: true,
          type: true,
          currentPrice: true,
        },
      },
    },
    orderBy: { date: "asc" },
  })

  const quantityByAsset = new Map<string, number>()
  const assetById = new Map<string, NonNullable<(typeof transactions)[number]["asset"]>>()

  for (const transaction of transactions) {
    if (!transaction.assetId || !transaction.asset) continue

    const quantity = transaction.quantity ?? 0
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    const currentQuantity = quantityByAsset.get(transaction.assetId) ?? 0
    quantityByAsset.set(
      transaction.assetId,
      transaction.type === "buy" ? currentQuantity + quantity : Math.max(currentQuantity - quantity, 0),
    )
    assetById.set(transaction.assetId, transaction.asset)
  }

  return Array.from(quantityByAsset.entries()).flatMap(([assetId, quantity]) => {
    const asset = assetById.get(assetId)
    if (!asset || quantity <= 0) return []

    return {
      assetId,
      symbol: asset.symbol,
      name: asset.name,
      type: normalizeAssetType(asset.type),
      quantity,
      currentPrice: asset.currentPrice,
      value: quantity * asset.currentPrice,
    }
  })
}

async function calculatePortfolioSummary(userId: string): Promise<PortfolioSummary> {
  const [portfolioAssetHoldings, transactionHoldings] = await Promise.all([
    getPortfolioAssetHoldings(userId),
    getTransactionDerivedHoldings(userId),
  ])

  if (portfolioAssetHoldings.length === 0 && transactionHoldings.length > 0) {
    return buildSummary(transactionHoldings, "transactions")
  }

  if (portfolioAssetHoldings.length > 0) {
    const holdingsByAsset = new Map(portfolioAssetHoldings.map((holding) => [holding.assetId, holding]))
    let addedTransactionHoldings = false

    for (const holding of transactionHoldings) {
      if (holdingsByAsset.has(holding.assetId)) continue
      holdingsByAsset.set(holding.assetId, holding)
      addedTransactionHoldings = true
    }

    return buildSummary(
      Array.from(holdingsByAsset.values()),
      addedTransactionHoldings ? "mixed" : "portfolio_assets",
    )
  }

  return buildSummary([], "empty")
}

export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  return cached({
    key: cacheKeys.userPortfolioSummary(userId),
    ttlSeconds: 120,
    label: `portfolio-summary user=${userId}`,
    fetcher: () => calculatePortfolioSummary(userId),
  })
}
