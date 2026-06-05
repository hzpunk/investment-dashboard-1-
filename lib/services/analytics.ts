import "server-only"

import { prisma } from "@/lib/prisma"
import {
  buildPerformancePeriods,
  buildProjectionScenarios,
  calculatePortfolioMetrics,
  calculateReturnMetrics,
  derivePerformanceSeriesFromTransactions,
  derivePositionsFromTransactions,
} from "@/lib/finance"
import type {
  AccountBalanceInput,
  AnalyticsDto,
  AnalyticsProjectionDefaultsDto,
  AnalyticsTransactionStatsDto,
  FinanceTransactionInput,
  PortfolioAssetInput,
} from "@/lib/finance"

type BuildAnalyticsOptions = {
  fromDate: Date
  toDate: Date
  portfolioId?: string | null
}

function mapPortfolioAssets(rows: Array<{
  assetId: string
  quantity: number
  averageBuyPrice: number
  asset: {
    symbol: string
    name: string
    type: string
    currentPrice: number
    currency: string
    updatedAt: Date
  }
}>): PortfolioAssetInput[] {
  return rows.map((row) => ({
    assetId: row.assetId,
    symbol: row.asset.symbol,
    name: row.asset.name,
    type: row.asset.type,
    quantity: row.quantity,
    currentPrice: row.asset.currentPrice,
    averageBuyPrice: row.averageBuyPrice,
    currency: row.asset.currency,
    updatedAt: row.asset.updatedAt,
  }))
}

function mapTransactions(rows: Array<{
  id: string
  assetId: string | null
  type: string
  quantity: number | null
  pricePerUnit: number | null
  totalAmount: number
  fee: number
  currency: string
  date: Date
  asset: {
    id: string
    symbol: string
    name: string
    type: string
    currentPrice: number
    currency: string
    updatedAt: Date
  } | null
}>): FinanceTransactionInput[] {
  return rows.map((row) => ({
    id: row.id,
    assetId: row.assetId,
    type: row.type,
    quantity: row.quantity,
    pricePerUnit: row.pricePerUnit,
    totalAmount: row.totalAmount,
    fee: row.fee,
    currency: row.currency,
    date: row.date,
    asset: row.asset,
  }))
}

function combinePositionSources(portfolioPositions: PortfolioAssetInput[], transactionPositions: PortfolioAssetInput[]) {
  if (portfolioPositions.length === 0 && transactionPositions.length === 0) {
    return { positions: [], source: "empty" as const }
  }

  if (portfolioPositions.length === 0) {
    return { positions: transactionPositions, source: "transactions" as const }
  }

  const portfolioAssetIds = new Set(portfolioPositions.map((position) => position.assetId))
  const missingTransactionPositions = transactionPositions.filter((position) => !portfolioAssetIds.has(position.assetId))

  return {
    positions: [...portfolioPositions, ...missingTransactionPositions],
    source: missingTransactionPositions.length > 0 ? ("mixed" as const) : ("portfolio_assets" as const),
  }
}

function buildTransactionStats(transactions: FinanceTransactionInput[], fromDate: Date, toDate: Date): AnalyticsTransactionStatsDto {
  const stats: AnalyticsTransactionStatsDto = {
    total: 0,
    buy: 0,
    sell: 0,
    dividend: 0,
    interest: 0,
    deposit: 0,
    withdrawal: 0,
    totalAmount: 0,
    totalFees: 0,
    periodStart: fromDate.toISOString(),
    periodEnd: toDate.toISOString(),
  }

  for (const transaction of transactions) {
    const transactionDate = new Date(transaction.date)
    if (transactionDate < fromDate || transactionDate > toDate) continue

    stats.total += 1
    stats.totalAmount += Number.isFinite(Number(transaction.totalAmount)) ? Number(transaction.totalAmount) : 0
    stats.totalFees += Number.isFinite(Number(transaction.fee)) ? Number(transaction.fee) : 0

    if (transaction.type in stats && typeof stats[transaction.type as keyof AnalyticsTransactionStatsDto] === "number") {
      ;(stats[transaction.type as "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal"] as number) += 1
    }
  }

  stats.totalAmount = Number(stats.totalAmount.toFixed(2))
  stats.totalFees = Number(stats.totalFees.toFixed(2))
  return stats
}

function buildProjectionDefaults(totalPortfolioValue: number): AnalyticsProjectionDefaultsDto {
  const initialAmount = Math.max(0, totalPortfolioValue)
  const monthlyContribution = initialAmount > 0 ? Math.max(100, Math.round(initialAmount * 0.03)) : 500
  const annualReturnPercent = 7
  const horizonYears = 10
  const inflationPercent = 4
  const scenarios = buildProjectionScenarios({
    principal: initialAmount,
    monthlyContribution,
    annualRatePercent: annualReturnPercent,
    inflationRatePercent: inflationPercent,
    months: horizonYears * 12,
  })

  return {
    initialAmount,
    monthlyContribution,
    annualReturnPercent,
    horizonYears,
    inflationPercent,
    scenarios,
  }
}

export async function buildAnalyticsDto(userId: string, options: BuildAnalyticsOptions): Promise<AnalyticsDto> {
  const { fromDate, toDate, portfolioId } = options

  const [portfolioAssets, transactionsRaw, accounts, portfoliosCount] = await Promise.all([
    prisma.portfolioAsset.findMany({
      where: {
        quantity: { gt: 0 },
        portfolio: {
          userId,
          ...(portfolioId ? { id: portfolioId } : {}),
        },
      },
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
      where: {
        userId,
        date: { lte: toDate },
      },
      select: {
        id: true,
        assetId: true,
        type: true,
        quantity: true,
        pricePerUnit: true,
        totalAmount: true,
        fee: true,
        currency: true,
        date: true,
        asset: {
          select: {
            id: true,
            symbol: true,
            name: true,
            type: true,
            currentPrice: true,
            currency: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { date: "asc" },
      take: 5000,
    }),
    prisma.account.findMany({
      where: { userId },
      select: { balance: true, currency: true },
    }),
    prisma.portfolio.count({ where: { userId } }),
  ])

  void portfoliosCount

  const transactions = mapTransactions(transactionsRaw)
  const transactionPositions = derivePositionsFromTransactions(transactions)
  const sourcePositions = combinePositionSources(mapPortfolioAssets(portfolioAssets), transactionPositions)
  const accountBalances: AccountBalanceInput[] = accounts.map((account) => ({
    balance: account.balance,
    currency: account.currency,
  }))
  const metrics = calculatePortfolioMetrics(sourcePositions.positions, transactions, accountBalances)
  const points = derivePerformanceSeriesFromTransactions(transactions, metrics.positions, toDate)
  const byPeriod = buildPerformancePeriods(points, toDate)
  const returnMetrics = calculateReturnMetrics(points)

  return {
    summary: {
      totalPortfolioValue: metrics.totalPortfolioValue,
      totalInvested: metrics.totalInvestedAmount,
      cashBalance: metrics.cashBalance,
      unrealizedPnL: metrics.unrealizedPnL,
      realizedPnL: metrics.realizedPnL,
      totalPnL: metrics.totalPnL,
      pnlPercent: metrics.pnlPercent,
      assetCount: metrics.assetCount,
      largestPosition: metrics.largestPosition
        ? {
            symbol: metrics.largestPosition.symbol,
            name: metrics.largestPosition.name,
            type: metrics.largestPosition.type,
            value: metrics.largestPosition.marketValue,
            percent: metrics.largestPosition.allocationPercent,
          }
        : null,
      diversificationScore: metrics.diversificationScore,
      updatedAt: metrics.updatedAt,
      source: sourcePositions.source,
    },
    performance: {
      points,
      byPeriod,
      metrics: returnMetrics,
      hasData: points.length >= 2,
      emptyReason: points.length >= 2 ? null : "insufficient_data",
    },
    allocation: {
      totalValue: metrics.totalPortfolioValue,
      assetCount: metrics.assetCount,
      byType: metrics.allocationByType,
      byAsset: metrics.allocationByAsset,
      byCurrency: metrics.allocationByCurrency,
      bySector: metrics.allocationBySector,
    },
    positions: metrics.positions,
    risk: metrics.risk,
    transactionStats: buildTransactionStats(transactions, fromDate, toDate),
    projectionDefaults: buildProjectionDefaults(metrics.totalPortfolioValue),
    period: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
  }
}
