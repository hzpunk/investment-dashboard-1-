import { nonNegative, roundTo, toFiniteNumber } from "@/lib/finance/calculations"
import type { ProjectionPoint, ProjectionScenario } from "@/lib/finance/types"

export type ProjectionInput = {
  principal: number
  monthlyContribution?: number
  annualRatePercent: number
  months: number
  inflationRatePercent?: number
}

function monthlyRate(annualRatePercent: number) {
  return toFiniteNumber(annualRatePercent) / 100 / 12
}

export function calculateCompoundInterest(principal: unknown, annualRatePercent: unknown, months: unknown): number {
  const safePrincipal = nonNegative(principal)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const rate = monthlyRate(toFiniteNumber(annualRatePercent))
  return safePrincipal * Math.pow(1 + rate, safeMonths)
}

export function calculateFutureValueWithContributions(
  principal: unknown,
  monthlyContribution: unknown,
  annualRatePercent: unknown,
  months: unknown,
): number {
  const safePrincipal = nonNegative(principal)
  const contribution = nonNegative(monthlyContribution)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const rate = monthlyRate(toFiniteNumber(annualRatePercent))

  if (safeMonths === 0) return safePrincipal
  if (rate === 0) return safePrincipal + contribution * safeMonths

  return safePrincipal * Math.pow(1 + rate, safeMonths) + contribution * ((Math.pow(1 + rate, safeMonths) - 1) / rate)
}

export function calculateInflationAdjustedValue(value: unknown, inflationRatePercent: unknown, months: unknown): number {
  const safeValue = nonNegative(value)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const inflationRate = monthlyRate(toFiniteNumber(inflationRatePercent))
  if (inflationRate === 0 || safeMonths === 0) return safeValue
  return safeValue / Math.pow(1 + inflationRate, safeMonths)
}

export function calculateMonthlyContributionForTarget(
  targetValue: unknown,
  principal: unknown,
  annualRatePercent: unknown,
  months: unknown,
): number | null {
  const target = nonNegative(targetValue)
  const safePrincipal = nonNegative(principal)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const rate = monthlyRate(toFiniteNumber(annualRatePercent))

  if (target <= safePrincipal) return 0
  if (safeMonths <= 0) return null

  if (rate === 0) {
    return (target - safePrincipal) / safeMonths
  }

  const principalFutureValue = safePrincipal * Math.pow(1 + rate, safeMonths)
  const annuityFactor = (Math.pow(1 + rate, safeMonths) - 1) / rate
  if (annuityFactor <= 0) return null
  return Math.max(0, (target - principalFutureValue) / annuityFactor)
}

export function calculateMonthsToTarget(
  targetValue: unknown,
  principal: unknown,
  monthlyContribution: unknown,
  annualRatePercent: unknown,
  maxMonths = 1200,
): number | null {
  const target = nonNegative(targetValue)
  const safePrincipal = nonNegative(principal)
  const contribution = nonNegative(monthlyContribution)
  const rate = monthlyRate(toFiniteNumber(annualRatePercent))

  if (target <= safePrincipal) return 0
  if (contribution <= 0 && rate <= 0) return null

  let value = safePrincipal
  for (let month = 1; month <= maxMonths; month += 1) {
    value = value * (1 + rate) + contribution
    if (value >= target) return month
  }

  return null
}

export function buildProjectionSeries(input: ProjectionInput): ProjectionPoint[] {
  const principal = nonNegative(input.principal)
  const contribution = nonNegative(input.monthlyContribution)
  const months = Math.max(0, Math.floor(nonNegative(input.months)))
  const rate = monthlyRate(input.annualRatePercent)
  const inflationRatePercent = toFiniteNumber(input.inflationRatePercent)
  const points: ProjectionPoint[] = []

  for (let month = 0; month <= months; month += 1) {
    const value =
      month === 0
        ? principal
        : rate === 0
          ? principal + contribution * month
          : principal * Math.pow(1 + rate, month) + contribution * ((Math.pow(1 + rate, month) - 1) / rate)
    const contributed = principal + contribution * month
    points.push({
      month,
      value: roundTo(value),
      contributed: roundTo(contributed),
      interest: roundTo(value - contributed),
      inflationAdjustedValue: roundTo(calculateInflationAdjustedValue(value, inflationRatePercent, month)),
    })
  }

  return points
}

export function buildProjectionScenarios(input: ProjectionInput): ProjectionScenario[] {
  const baseRate = toFiniteNumber(input.annualRatePercent)
  const scenarios: Array<{ id: ProjectionScenario["id"]; rate: number }> = [
    { id: "conservative", rate: Math.max(0, baseRate - 3) },
    { id: "base", rate: baseRate },
    { id: "optimistic", rate: baseRate + 3 },
  ]

  return scenarios.map((scenario) => {
    const points = buildProjectionSeries({ ...input, annualRatePercent: scenario.rate })
    const finalPoint = points[points.length - 1] ?? {
      value: nonNegative(input.principal),
      inflationAdjustedValue: nonNegative(input.principal),
    }

    return {
      id: scenario.id,
      annualReturnPercent: scenario.rate,
      finalValue: finalPoint.value,
      inflationAdjustedFinalValue: finalPoint.inflationAdjustedValue,
      points,
    }
  })
}
