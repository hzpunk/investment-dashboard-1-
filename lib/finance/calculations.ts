import type { PortfolioPerformancePoint, ReturnMetrics } from "@/lib/finance/types"

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

export function nonNegative(value: unknown, fallback = 0): number {
  return Math.max(0, toFiniteNumber(value, fallback))
}

export function roundTo(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback
  return numerator / denominator
}

export function calculateAssetMarketValue(quantity: unknown, currentPrice: unknown): number {
  return nonNegative(quantity) * nonNegative(currentPrice)
}

export function calculateUnrealizedPnL(quantity: unknown, currentPrice: unknown, averagePrice: unknown): number {
  const safeQuantity = nonNegative(quantity)
  return safeQuantity * nonNegative(currentPrice) - safeQuantity * nonNegative(averagePrice)
}

export function calculatePnLPercent(pnl: unknown, costBasis: unknown): number {
  return safeDivide(toFiniteNumber(pnl), nonNegative(costBasis)) * 100
}

export function calculateAllocationPercent(value: unknown, totalValue: unknown): number {
  return safeDivide(nonNegative(value), nonNegative(totalValue)) * 100
}

export function calculateSimpleReturnPercent(initialValue: unknown, currentValue: unknown): number {
  const initial = nonNegative(initialValue)
  if (initial <= 0) return 0
  return ((toFiniteNumber(currentValue) - initial) / initial) * 100
}

export function calculateCumulativeReturnPercent(initialValue: unknown, currentValue: unknown): number {
  return calculateSimpleReturnPercent(initialValue, currentValue)
}

export function calculateAnnualizedReturnPercent(initialValue: unknown, currentValue: unknown, days: unknown): number | null {
  const initial = nonNegative(initialValue)
  const current = nonNegative(currentValue)
  const safeDays = nonNegative(days)
  if (initial <= 0 || current <= 0 || safeDays < 1) return null

  return (Math.pow(current / initial, 365 / safeDays) - 1) * 100
}

export function calculateCagrPercent(initialValue: unknown, currentValue: unknown, years: unknown): number | null {
  const initial = nonNegative(initialValue)
  const current = nonNegative(currentValue)
  const safeYears = nonNegative(years)
  if (initial <= 0 || current <= 0 || safeYears <= 0) return null

  return (Math.pow(current / initial, 1 / safeYears) - 1) * 100
}

export function calculateVolatilityPercent(returnsPercent: unknown[]): number | null {
  const returns = returnsPercent.map((value) => toFiniteNumber(value, Number.NaN)).filter(Number.isFinite)
  if (returns.length < 2) return null

  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / (returns.length - 1)
  return Math.sqrt(variance)
}

export function calculateMaxDrawdownPercent(values: unknown[]): number | null {
  const series = values.map((value) => nonNegative(value)).filter((value) => value > 0)
  if (series.length < 2) return null

  let peak = series[0]
  let maxDrawdown = 0

  for (const value of series) {
    peak = Math.max(peak, value)
    const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  }

  return maxDrawdown
}

function dailyReturns(points: PortfolioPerformancePoint[]): number[] {
  const returns: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]?.portfolioValue ?? 0
    const current = points[index]?.portfolioValue ?? 0
    if (previous > 0 && current >= 0) {
      returns.push(((current - previous) / previous) * 100)
    }
  }
  return returns
}

export function calculateAverageMonthlyReturnPercent(points: PortfolioPerformancePoint[]): number | null {
  if (points.length < 2) return null

  const monthly = new Map<string, { first: number; last: number }>()
  for (const point of points) {
    const month = point.date.slice(0, 7)
    const current = monthly.get(month)
    if (!current) {
      monthly.set(month, { first: point.portfolioValue, last: point.portfolioValue })
    } else {
      current.last = point.portfolioValue
    }
  }

  const returns = Array.from(monthly.values())
    .filter((item) => item.first > 0)
    .map((item) => ((item.last - item.first) / item.first) * 100)

  if (returns.length === 0) return null
  return returns.reduce((sum, value) => sum + value, 0) / returns.length
}

export function calculateReturnMetrics(points: PortfolioPerformancePoint[]): ReturnMetrics {
  if (points.length < 2) {
    return {
      simpleReturnPercent: 0,
      cumulativeReturnPercent: 0,
      annualizedReturnPercent: null,
      cagrPercent: null,
      averageMonthlyReturnPercent: null,
      volatilityPercent: null,
      maxDrawdownPercent: null,
    }
  }

  const first = points[0]
  const last = points[points.length - 1]
  const firstDate = new Date(first.date)
  const lastDate = new Date(last.date)
  const days = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000))
  const years = days / 365
  const initialValue = first.portfolioValue
  const currentValue = last.portfolioValue

  return {
    simpleReturnPercent: calculateSimpleReturnPercent(initialValue, currentValue),
    cumulativeReturnPercent: calculateCumulativeReturnPercent(initialValue, currentValue),
    annualizedReturnPercent: calculateAnnualizedReturnPercent(initialValue, currentValue, days),
    cagrPercent: calculateCagrPercent(initialValue, currentValue, years),
    averageMonthlyReturnPercent: calculateAverageMonthlyReturnPercent(points),
    volatilityPercent: calculateVolatilityPercent(dailyReturns(points)),
    maxDrawdownPercent: calculateMaxDrawdownPercent(points.map((point) => point.portfolioValue)),
  }
}
