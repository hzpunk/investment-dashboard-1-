import {
  calculateAllocationPercent,
  calculateAssetMarketValue,
  calculatePnLPercent,
  calculateUnrealizedPnL,
  nonNegative,
  roundTo,
  safeDivide,
  toFiniteNumber,
} from "@/lib/finance/calculations"
import type {
  AccountBalanceInput,
  AllocationItem,
  AssetType,
  FinanceTransactionInput,
  PerformancePeriod,
  PortfolioAssetInput,
  PortfolioMetrics,
  PortfolioPerformancePoint,
  PositionMetrics,
} from "@/lib/finance/types"

const VALID_ASSET_TYPES = new Set<AssetType>(["stock", "bond", "etf", "crypto", "commodity", "other"])
const STALE_PRICE_MS = 24 * 60 * 60 * 1000

export function normalizeAssetType(type: unknown): AssetType {
  const normalized = typeof type === "string" ? type.trim().toLowerCase() : ""
  return VALID_ASSET_TYPES.has(normalized as AssetType) ? (normalized as AssetType) : "other"
}

function normalizeCurrency(currency: unknown): string {
  const normalized = typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : "USD"
  return normalized.slice(0, 12)
}

function dateToIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function isPriceStale(updatedAt: Date | string | null | undefined): boolean {
  const iso = dateToIso(updatedAt)
  if (!iso) return true
  return Date.now() - new Date(iso).getTime() > STALE_PRICE_MS
}

type CostBasisState = {
  quantity: number
  cost: number
  realizedPnL: number
  dividends: number
}

export function calculateTransactionCostBasis(transactions: FinanceTransactionInput[]) {
  const byAsset = new Map<string, CostBasisState>()
  let realizedPnL = 0

  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  for (const transaction of sorted) {
    const assetId = transaction.assetId ?? transaction.asset?.id ?? null
    const amount = nonNegative(transaction.totalAmount)
    const fee = nonNegative(transaction.fee)

    if (transaction.type === "dividend" || transaction.type === "interest") {
      realizedPnL += amount - fee
      if (assetId) {
        const state = byAsset.get(assetId) ?? { quantity: 0, cost: 0, realizedPnL: 0, dividends: 0 }
        state.dividends += amount - fee
        byAsset.set(assetId, state)
      }
      continue
    }

    if (!assetId || (transaction.type !== "buy" && transaction.type !== "sell")) continue

    const quantity = nonNegative(transaction.quantity)
    if (quantity <= 0) continue

    const state = byAsset.get(assetId) ?? { quantity: 0, cost: 0, realizedPnL: 0, dividends: 0 }

    if (transaction.type === "buy") {
      state.quantity += quantity
      state.cost += amount + fee
    }

    if (transaction.type === "sell") {
      const sellQuantity = Math.min(quantity, state.quantity)
      const averageCost = state.quantity > 0 ? state.cost / state.quantity : 0
      const soldCost = averageCost * sellQuantity
      const proceeds = amount - fee
      const pnl = proceeds - soldCost

      state.quantity = Math.max(0, state.quantity - sellQuantity)
      state.cost = Math.max(0, state.cost - soldCost)
      state.realizedPnL += pnl
      realizedPnL += pnl
    }

    byAsset.set(assetId, state)
  }

  return { byAsset, realizedPnL }
}

export function derivePositionsFromTransactions(transactions: FinanceTransactionInput[]): PortfolioAssetInput[] {
  const { byAsset } = calculateTransactionCostBasis(transactions)
  const assetMeta = new Map<string, NonNullable<FinanceTransactionInput["asset"]>>()

  for (const transaction of transactions) {
    const assetId = transaction.assetId ?? transaction.asset?.id ?? null
    if (assetId && transaction.asset) {
      assetMeta.set(assetId, transaction.asset)
    }
  }

  return Array.from(byAsset.entries()).flatMap(([assetId, state]) => {
    const meta = assetMeta.get(assetId)
    if (!meta || state.quantity <= 0) return []

    return {
      assetId,
      symbol: meta.symbol ?? "UNKNOWN",
      name: meta.name ?? meta.symbol ?? "Unknown",
      type: normalizeAssetType(meta.type),
      quantity: state.quantity,
      currentPrice: nonNegative(meta.currentPrice),
      averageBuyPrice: state.quantity > 0 ? state.cost / state.quantity : 0,
      currency: meta.currency ?? "USD",
      updatedAt: meta.updatedAt ?? null,
    }
  })
}

function mergePositions(positions: PortfolioAssetInput[]): PortfolioAssetInput[] {
  const byAsset = new Map<string, PortfolioAssetInput & { weightedAverageTotal: number }>()

  for (const position of positions) {
    if (!position.assetId) continue
    const quantity = nonNegative(position.quantity)
    if (quantity <= 0) continue

    const averageBuyPrice = nonNegative(position.averageBuyPrice)
    const current = byAsset.get(position.assetId)
    if (!current) {
      byAsset.set(position.assetId, {
        ...position,
        quantity,
        averageBuyPrice,
        weightedAverageTotal: averageBuyPrice * quantity,
      })
      continue
    }

    current.quantity = nonNegative(current.quantity) + quantity
    current.weightedAverageTotal += averageBuyPrice * quantity
    current.averageBuyPrice = current.quantity > 0 ? current.weightedAverageTotal / current.quantity : 0
    current.currentPrice = nonNegative(position.currentPrice, nonNegative(current.currentPrice))
    current.updatedAt = position.updatedAt ?? current.updatedAt
  }

  return Array.from(byAsset.values()).map(({ weightedAverageTotal, ...position }) => position)
}

function buildAllocation(
  positions: PositionMetrics[],
  totalValue: number,
  getKey: (position: PositionMetrics) => string | null | undefined,
  getLabel: (position: PositionMetrics) => string | null | undefined = getKey,
): AllocationItem[] {
  const grouped = new Map<string, { label: string; value: number; count: number }>()

  for (const position of positions) {
    if (position.marketValue <= 0) continue
    const key = getKey(position)?.trim() || "other"
    const label = getLabel(position)?.trim() || key
    const current = grouped.get(key) ?? { label, value: 0, count: 0 }
    current.value += position.marketValue
    current.count += 1
    grouped.set(key, current)
  }

  return Array.from(grouped.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      value: roundTo(item.value),
      percent: roundTo(calculateAllocationPercent(item.value, totalValue), 2),
      count: item.count,
    }))
    .sort((a, b) => b.value - a.value)
}

export function groupSmallAllocations(items: AllocationItem[], options: { minPercent?: number; maxItems?: number; otherLabel?: string } = {}) {
  const minPercent = options.minPercent ?? 1
  const maxItems = options.maxItems ?? 8
  const otherLabel = options.otherLabel ?? "Other"

  if (items.length <= maxItems) return items

  const visible: AllocationItem[] = []
  const small: AllocationItem[] = []

  items.forEach((item, index) => {
    if (index < maxItems - 1 && item.percent >= minPercent) {
      visible.push(item)
    } else {
      small.push(item)
    }
  })

  if (small.length === 0) return visible

  const otherValue = small.reduce((sum, item) => sum + item.value, 0)
  const totalValue = items.reduce((sum, item) => sum + item.value, 0)

  return [
    ...visible,
    {
      key: "other-small",
      label: otherLabel,
      value: roundTo(otherValue),
      percent: roundTo(calculateAllocationPercent(otherValue, totalValue), 2),
      count: small.reduce((sum, item) => sum + item.count, 0),
    },
  ]
}

export function calculateDiversificationScore(values: number[]): number {
  const positiveValues = values.filter((value) => Number.isFinite(value) && value > 0)
  const total = positiveValues.reduce((sum, value) => sum + value, 0)
  const count = positiveValues.length

  if (total <= 0 || count === 0) return 0
  if (count === 1) return 0

  const hhi = positiveValues.reduce((sum, value) => {
    const share = value / total
    return sum + share ** 2
  }, 0)
  const normalized = (1 - hhi) / (1 - 1 / count)
  return roundTo(Math.max(0, Math.min(100, normalized * 100)), 1)
}

export function calculatePortfolioMetrics(
  inputPositions: PortfolioAssetInput[],
  transactions: FinanceTransactionInput[] = [],
  accounts: AccountBalanceInput[] = [],
): PortfolioMetrics {
  const costBasis = calculateTransactionCostBasis(transactions)
  const mergedPositions = mergePositions(inputPositions)

  const positionsWithoutAllocation = mergedPositions.map((position): PositionMetrics => {
    const quantity = nonNegative(position.quantity)
    const currentPrice = nonNegative(position.currentPrice)
    const transactionBasis = costBasis.byAsset.get(position.assetId)
    const averageBuyPrice =
      nonNegative(position.averageBuyPrice) || (transactionBasis && transactionBasis.quantity > 0 ? transactionBasis.cost / transactionBasis.quantity : 0)
    const marketValue = calculateAssetMarketValue(quantity, currentPrice)
    const cost = quantity * averageBuyPrice
    const unrealizedPnL = calculateUnrealizedPnL(quantity, currentPrice, averageBuyPrice)
    const updatedAt = dateToIso(position.updatedAt)

    return {
      assetId: position.assetId,
      symbol: position.symbol,
      name: position.name,
      type: normalizeAssetType(position.type),
      quantity: roundTo(quantity, 8),
      currentPrice: roundTo(currentPrice, 6),
      averageBuyPrice: roundTo(averageBuyPrice, 6),
      marketValue: roundTo(marketValue),
      costBasis: roundTo(cost),
      unrealizedPnL: roundTo(unrealizedPnL),
      unrealizedPnLPercent: roundTo(calculatePnLPercent(unrealizedPnL, cost), 2),
      allocationPercent: 0,
      currency: normalizeCurrency(position.currency),
      sector: position.sector ?? position.category ?? null,
      updatedAt,
      isPriceMissing: currentPrice <= 0,
      isPriceStale: isPriceStale(position.updatedAt),
    }
  })

  const totalPortfolioValue = positionsWithoutAllocation.reduce((sum, position) => sum + position.marketValue, 0)
  const positions = positionsWithoutAllocation
    .map((position) => ({
      ...position,
      allocationPercent: roundTo(calculateAllocationPercent(position.marketValue, totalPortfolioValue), 2),
    }))
    .sort((a, b) => b.marketValue - a.marketValue)

  const cashBalance = accounts.reduce((sum, account) => sum + nonNegative(account.balance), 0)
  const totalInvestedAmount = positions.reduce((sum, position) => sum + position.costBasis, 0)
  const unrealizedPnL = positions.reduce((sum, position) => sum + position.unrealizedPnL, 0)
  const realizedPnL = transactions.length > 0 ? costBasis.realizedPnL : null
  const totalPnL = unrealizedPnL + (realizedPnL ?? 0)
  const largestPosition = positions[0] ?? null
  const largestPositionShare = largestPosition ? calculateAllocationPercent(largestPosition.marketValue, totalPortfolioValue) : 0
  const diversificationScore = calculateDiversificationScore(positions.map((position) => position.marketValue))
  const investableTotal = totalPortfolioValue + cashBalance
  const cashShare = calculateAllocationPercent(cashBalance, investableTotal)
  const cryptoValue = positions.filter((position) => position.type === "crypto").reduce((sum, position) => sum + position.marketValue, 0)
  const cryptoShare = calculateAllocationPercent(cryptoValue, totalPortfolioValue)
  const stalePriceCount = positions.filter((position) => position.isPriceStale).length
  const missingPriceCount = positions.filter((position) => position.isPriceMissing).length
  const concentrationRisk = largestPositionShare >= 35 || diversificationScore < 40 ? "high" : largestPositionShare >= 20 ? "medium" : "low"

  const warnings = [
    ...(largestPositionShare >= 35 ? [{ code: "high_concentration" as const, severity: "warning" as const, value: roundTo(largestPositionShare, 1) }] : []),
    ...(diversificationScore < 40 && positions.length > 0
      ? [{ code: "low_diversification" as const, severity: "warning" as const, value: diversificationScore }]
      : []),
    ...(stalePriceCount > 0 ? [{ code: "stale_prices" as const, severity: "info" as const, value: stalePriceCount }] : []),
    ...(missingPriceCount > 0 ? [{ code: "missing_prices" as const, severity: "warning" as const, value: missingPriceCount }] : []),
    ...(cryptoShare >= 25 ? [{ code: "high_crypto_exposure" as const, severity: "warning" as const, value: roundTo(cryptoShare, 1) }] : []),
    ...(cashShare >= 40 ? [{ code: "high_cash_share" as const, severity: "info" as const, value: roundTo(cashShare, 1) }] : []),
  ]

  const updatedAtValues = positions
    .map((position) => position.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()

  return {
    totalPortfolioValue: roundTo(totalPortfolioValue),
    cashBalance: roundTo(cashBalance),
    totalInvestedAmount: roundTo(totalInvestedAmount),
    unrealizedPnL: roundTo(unrealizedPnL),
    realizedPnL: realizedPnL === null ? null : roundTo(realizedPnL),
    totalPnL: roundTo(totalPnL),
    pnlPercent: roundTo(calculatePnLPercent(totalPnL, totalInvestedAmount), 2),
    assetCount: positions.length,
    positions,
    allocationByType: buildAllocation(positions, totalPortfolioValue, (position) => position.type, (position) => position.type),
    allocationByAsset: buildAllocation(positions, totalPortfolioValue, (position) => position.assetId, (position) => position.symbol),
    allocationByCurrency: buildAllocation(positions, totalPortfolioValue, (position) => position.currency),
    allocationBySector: buildAllocation(positions, totalPortfolioValue, (position) => position.sector),
    largestPosition,
    largestPositionShare: roundTo(largestPositionShare, 2),
    diversificationScore,
    risk: {
      concentrationRisk,
      largestPositionShare: roundTo(largestPositionShare, 2),
      diversificationScore,
      cashShare: roundTo(cashShare, 2),
      cryptoShare: roundTo(cryptoShare, 2),
      stalePriceCount,
      missingPriceCount,
      warnings,
    },
    updatedAt: updatedAtValues[updatedAtValues.length - 1] ?? null,
  }
}

function performancePoint(date: Date, portfolioValue: number, investedAmount: number, realizedPnL: number): PortfolioPerformancePoint {
  const pnl = portfolioValue - investedAmount + realizedPnL
  return {
    date: date.toISOString(),
    portfolioValue: roundTo(portfolioValue),
    investedAmount: roundTo(investedAmount),
    pnl: roundTo(pnl),
    pnlPercent: roundTo(calculatePnLPercent(pnl, investedAmount), 2),
  }
}

export function derivePerformanceSeriesFromTransactions(
  transactions: FinanceTransactionInput[],
  currentPositions: PositionMetrics[],
  now = new Date(),
): PortfolioPerformancePoint[] {
  const investmentTransactions = transactions
    .filter((transaction) => ["buy", "sell", "dividend", "interest"].includes(transaction.type))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (investmentTransactions.length === 0) return []

  const quantityByAsset = new Map<string, number>()
  const costByAsset = new Map<string, number>()
  const priceByAsset = new Map<string, number>()
  let realizedPnL = 0
  const points: PortfolioPerformancePoint[] = []
  const firstDate = new Date(investmentTransactions[0].date)
  points.push(performancePoint(new Date(firstDate.getTime() - 24 * 60 * 60 * 1000), 0, 0, 0))

  for (const transaction of investmentTransactions) {
    const assetId = transaction.assetId ?? transaction.asset?.id ?? null
    const amount = nonNegative(transaction.totalAmount)
    const fee = nonNegative(transaction.fee)
    const date = new Date(transaction.date)

    if (transaction.type === "dividend" || transaction.type === "interest") {
      realizedPnL += amount - fee
    }

    if (assetId && (transaction.type === "buy" || transaction.type === "sell")) {
      const quantity = nonNegative(transaction.quantity)
      const price = nonNegative(transaction.pricePerUnit, safeDivide(amount, quantity))
      if (price > 0) priceByAsset.set(assetId, price)

      const currentQuantity = quantityByAsset.get(assetId) ?? 0
      const currentCost = costByAsset.get(assetId) ?? 0

      if (transaction.type === "buy") {
        quantityByAsset.set(assetId, currentQuantity + quantity)
        costByAsset.set(assetId, currentCost + amount + fee)
      } else if (currentQuantity > 0) {
        const sellQuantity = Math.min(quantity, currentQuantity)
        const averageCost = currentCost / currentQuantity
        const soldCost = averageCost * sellQuantity
        const proceeds = amount - fee
        realizedPnL += proceeds - soldCost
        quantityByAsset.set(assetId, Math.max(0, currentQuantity - sellQuantity))
        costByAsset.set(assetId, Math.max(0, currentCost - soldCost))
      }
    }

    let portfolioValue = 0
    for (const [assetId, quantity] of quantityByAsset.entries()) {
      portfolioValue += quantity * (priceByAsset.get(assetId) ?? 0)
    }
    const investedAmount = Array.from(costByAsset.values()).reduce((sum, value) => sum + value, 0)
    points.push(performancePoint(date, portfolioValue, investedAmount, realizedPnL))
  }

  const currentValue = currentPositions.reduce((sum, position) => sum + position.marketValue, 0)
  const currentInvested = currentPositions.reduce((sum, position) => sum + position.costBasis, 0)
  const lastPoint = points[points.length - 1]
  const finalDate = lastPoint && new Date(lastPoint.date).getTime() >= now.getTime() ? new Date(new Date(lastPoint.date).getTime() + 1000) : now
  points.push(performancePoint(finalDate, currentValue, currentInvested, realizedPnL))

  return points.filter((point, index, series) => {
    if (index === 0) return true
    const previous = series[index - 1]
    return point.date !== previous.date || point.portfolioValue !== previous.portfolioValue || point.investedAmount !== previous.investedAmount
  })
}

const PERIOD_MS: Record<Exclude<PerformancePeriod, "ALL">, number> = {
  "7D": 7 * 24 * 60 * 60 * 1000,
  "1M": 31 * 24 * 60 * 60 * 1000,
  "3M": 93 * 24 * 60 * 60 * 1000,
  "6M": 186 * 24 * 60 * 60 * 1000,
  "1Y": 366 * 24 * 60 * 60 * 1000,
}

export function filterPerformanceByPeriod(
  points: PortfolioPerformancePoint[],
  period: PerformancePeriod,
  now = new Date(),
): PortfolioPerformancePoint[] {
  if (period === "ALL") return points
  const cutoff = now.getTime() - PERIOD_MS[period]
  const filtered = points.filter((point) => new Date(point.date).getTime() >= cutoff)
  if (filtered.length >= 2) return filtered

  const firstBeforeCutoff = [...points].reverse().find((point) => new Date(point.date).getTime() < cutoff)
  return firstBeforeCutoff ? [firstBeforeCutoff, ...filtered] : filtered
}

export function buildPerformancePeriods(points: PortfolioPerformancePoint[], now = new Date()) {
  const periods: PerformancePeriod[] = ["7D", "1M", "3M", "6M", "1Y", "ALL"]
  return Object.fromEntries(periods.map((period) => [period, filterPerformanceByPeriod(points, period, now)])) as Record<
    PerformancePeriod,
    PortfolioPerformancePoint[]
  >
}

export function calculateWeightedAveragePurchasePrice(positions: PortfolioAssetInput[]): number {
  const totalQuantity = positions.reduce((sum, position) => sum + nonNegative(position.quantity), 0)
  if (totalQuantity <= 0) return 0
  const weightedTotal = positions.reduce(
    (sum, position) => sum + nonNegative(position.quantity) * nonNegative(position.averageBuyPrice),
    0,
  )
  return weightedTotal / totalQuantity
}
