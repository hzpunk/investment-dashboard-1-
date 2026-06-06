import "server-only"

import { prisma } from "@/lib/prisma"
import { ALL_ACCOUNTS_SCOPE, type AccountScope } from "@/lib/accounts/account-scope"
import { accountScopeCachePart } from "@/lib/accounts/account-scope.server"
import { convertMoney } from "@/lib/currency/conversion"
import { normalizeDisplayCurrency } from "@/lib/currency/display-currency"
import { getCbrCurrencyRates } from "@/lib/currency/rates"
import type { CurrencyRatesResult } from "@/lib/currency/types"
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
  accountScope?: AccountScope
  displayCurrency?: string
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

function requiresConversion(currencies: Array<string | null | undefined>, baseCurrency: string) {
  return currencies.some((currency) => currency && currency.toUpperCase() !== baseCurrency)
}

function convertAmount(value: number | null | undefined, currency: string | null | undefined, baseCurrency: string, rates: CurrencyRatesResult | null) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return { amount: 0, converted: false, failed: false }
  const sourceCurrency = (currency || baseCurrency).toUpperCase()
  if (sourceCurrency === baseCurrency) return { amount: numeric, converted: false, failed: false }
  if (!rates) return { amount: 0, converted: false, failed: true }
  const converted = convertMoney({ amount: numeric, currency: sourceCurrency }, baseCurrency, rates.rates, { stale: rates.stale })
  if (converted.error) return { amount: 0, converted: false, failed: true }
  return { amount: converted.converted.amount, converted: true, failed: false }
}

function convertPortfolioAssets(positions: PortfolioAssetInput[], baseCurrency: string, rates: CurrencyRatesResult | null) {
  let converted = 0
  let failed = 0
  const values = positions.map((position) => {
    const currentPrice = convertAmount(Number(position.currentPrice ?? 0), position.currency, baseCurrency, rates)
    const averageBuyPrice = convertAmount(Number(position.averageBuyPrice ?? 0), position.currency, baseCurrency, rates)
    if (currentPrice.converted || averageBuyPrice.converted) converted += 1
    if (currentPrice.failed || averageBuyPrice.failed) failed += 1
    return {
      ...position,
      currentPrice: currentPrice.amount,
      averageBuyPrice: averageBuyPrice.amount,
      currency: currentPrice.failed ? position.currency : baseCurrency,
    }
  })
  return { values, converted, failed }
}

function convertTransactions(transactions: FinanceTransactionInput[], baseCurrency: string, rates: CurrencyRatesResult | null) {
  let converted = 0
  let failed = 0
  const values = transactions.map((transaction) => {
    const amount = convertAmount(Number(transaction.totalAmount ?? 0), transaction.currency, baseCurrency, rates)
    const fee = convertAmount(Number(transaction.fee ?? 0), transaction.currency, baseCurrency, rates)
    const price = convertAmount(Number(transaction.pricePerUnit ?? 0), transaction.currency, baseCurrency, rates)
    const assetPrice = transaction.asset
      ? convertAmount(Number(transaction.asset.currentPrice ?? 0), transaction.asset.currency ?? transaction.currency, baseCurrency, rates)
      : null
    if (amount.converted || fee.converted || price.converted || assetPrice?.converted) converted += 1
    if (amount.failed || fee.failed || price.failed || assetPrice?.failed) failed += 1
    return {
      ...transaction,
      totalAmount: amount.amount,
      fee: fee.amount,
      pricePerUnit: transaction.pricePerUnit === null || transaction.pricePerUnit === undefined ? transaction.pricePerUnit : price.amount,
      currency: amount.failed ? transaction.currency : baseCurrency,
      asset: transaction.asset
        ? {
            ...transaction.asset,
            currentPrice: assetPrice?.amount ?? Number(transaction.asset.currentPrice ?? 0),
            currency: assetPrice?.failed ? transaction.asset.currency : baseCurrency,
          }
        : transaction.asset,
    }
  })
  return { values, converted, failed }
}

function convertAccountBalances(accounts: AccountBalanceInput[], baseCurrency: string, rates: CurrencyRatesResult | null) {
  let converted = 0
  let failed = 0
  const values = accounts.map((account) => {
    const balance = convertAmount(Number(account.balance ?? 0), account.currency, baseCurrency, rates)
    if (balance.converted) converted += 1
    if (balance.failed) failed += 1
    return {
      balance: balance.amount,
      currency: balance.failed ? account.currency : baseCurrency,
    }
  })
  return { values, converted, failed }
}

export async function buildAnalyticsDto(userId: string, options: BuildAnalyticsOptions): Promise<AnalyticsDto> {
  const { fromDate, toDate, portfolioId, accountScope = ALL_ACCOUNTS_SCOPE } = options
  const accountFilter = accountScope.type === "single" ? { accountId: accountScope.accountId } : {}
  const accountWhere = accountScope.type === "single" ? { userId, id: accountScope.accountId } : { userId }

  const [portfolioAssets, transactionsRaw, accounts, portfoliosCount] = await Promise.all([
    prisma.portfolioAsset.findMany({
      where: {
        quantity: { gt: 0 },
        ...(accountScope.type === "single" ? { portfolioId: "__account_scoped_positions_are_transaction_derived__" } : {}),
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
        ...accountFilter,
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
      where: accountWhere,
      select: { balance: true, currency: true },
    }),
    prisma.portfolio.count({ where: { userId } }),
  ])

  void portfoliosCount

  const rawTransactions = mapTransactions(transactionsRaw)
  const rawPortfolioPositions = mapPortfolioAssets(portfolioAssets)
  const rawAccountBalances: AccountBalanceInput[] = accounts.map((account) => ({
    balance: account.balance,
    currency: account.currency,
  }))
  const baseCurrency = normalizeDisplayCurrency(options.displayCurrency, "RUB")
  const needsRates = requiresConversion(
    [
      ...rawTransactions.map((transaction) => transaction.currency),
      ...rawPortfolioPositions.map((position) => position.currency),
      ...rawAccountBalances.map((account) => account.currency),
    ],
    baseCurrency,
  )
  const rates = needsRates ? await getCbrCurrencyRates(toDate) : null
  const convertedPortfolioPositions = convertPortfolioAssets(rawPortfolioPositions, baseCurrency, rates)
  const convertedTransactions = convertTransactions(rawTransactions, baseCurrency, rates)
  const convertedAccounts = convertAccountBalances(rawAccountBalances, baseCurrency, rates)
  const transactions = convertedTransactions.values
  const transactionPositions = derivePositionsFromTransactions(transactions)
  const sourcePositions = combinePositionSources(convertedPortfolioPositions.values, transactionPositions)
  const accountBalances = convertedAccounts.values
  const convertedCount = convertedPortfolioPositions.converted + convertedTransactions.converted + convertedAccounts.converted
  const failedCount = convertedPortfolioPositions.failed + convertedTransactions.failed + convertedAccounts.failed
  const metrics = calculatePortfolioMetrics(sourcePositions.positions, transactions, accountBalances)
  const points = derivePerformanceSeriesFromTransactions(transactions, metrics.positions, toDate)
  const byPeriod = buildPerformancePeriods(points, toDate)
  const returnMetrics = calculateReturnMetrics(points)
  const hasUsableConvertedValue = metrics.totalPortfolioValue > 0 || metrics.cashBalance > 0 || metrics.totalInvestedAmount > 0 || convertedCount > 0
  const conversionStatus =
    !needsRates
      ? "not_required"
      : failedCount > 0 && hasUsableConvertedValue
        ? "partial"
        : failedCount > 0
          ? "unavailable"
          : "converted"
  const conversionWarnings = [
    ...(failedCount > 0 ? ["CURRENCY_RATE_UNAVAILABLE"] : []),
    ...(rates?.stale ? ["CURRENCY_RATE_STALE"] : []),
    ...(convertedCount > 0 && points.length > 1 ? ["CURRENCY_HISTORICAL_CONVERSION_APPROXIMATE"] : []),
  ]

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
    currency: {
      baseCurrency,
      conversionApplied: convertedCount > 0,
      conversionStatus,
      rateSource: "CBR",
      rateDate: rates?.date ?? null,
      stale: Boolean(rates?.stale),
      warnings: conversionWarnings,
    },
    accountScope: {
      type: accountScope.type,
      accountId: accountScope.type === "single" ? accountScope.accountId : null,
      key: accountScopeCachePart(accountScope),
    },
  }
}
