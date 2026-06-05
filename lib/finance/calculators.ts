import { nonNegative, roundTo, safeDivide, toFiniteNumber } from "@/lib/finance/calculations"

export function calculateVatAdd(amount: unknown, ratePercent: unknown) {
  const base = nonNegative(amount)
  const rate = nonNegative(ratePercent) / 100
  const vat = base * rate
  return {
    base: roundTo(base),
    vat: roundTo(vat),
    total: roundTo(base + vat),
  }
}

export function calculateVatExtract(amountWithVat: unknown, ratePercent: unknown) {
  const total = nonNegative(amountWithVat)
  const rate = nonNegative(ratePercent) / 100
  const base = rate === 0 ? total : total / (1 + rate)
  const vat = total - base
  return {
    base: roundTo(base),
    vat: roundTo(vat),
    total: roundTo(total),
  }
}

export function calculateMarginAndMarkup(cost: unknown, price: unknown) {
  const safeCost = nonNegative(cost)
  const safePrice = nonNegative(price)
  const profit = safePrice - safeCost
  return {
    profit: roundTo(profit),
    marginPercent: roundTo(safeDivide(profit, safePrice) * 100),
    markupPercent: roundTo(safeDivide(profit, safeCost) * 100),
  }
}

export function calculateRevenueProfit(revenue: unknown, costs: unknown) {
  const safeRevenue = nonNegative(revenue)
  const safeCosts = nonNegative(costs)
  const profit = safeRevenue - safeCosts
  return {
    profit: roundTo(profit),
    marginPercent: roundTo(safeDivide(profit, safeRevenue) * 100),
  }
}

export function calculateBreakEvenPoint(fixedCosts: unknown, pricePerUnit: unknown, variableCostPerUnit: unknown) {
  const fixed = nonNegative(fixedCosts)
  const price = nonNegative(pricePerUnit)
  const variable = nonNegative(variableCostPerUnit)
  const contributionMargin = price - variable

  if (contributionMargin <= 0) {
    return {
      units: null,
      revenue: null,
      contributionMargin: roundTo(contributionMargin),
    }
  }

  const units = fixed / contributionMargin
  return {
    units: Math.ceil(units),
    revenue: roundTo(Math.ceil(units) * price),
    contributionMargin: roundTo(contributionMargin),
  }
}

export function calculateRoiPercent(investment: unknown, returnAmount: unknown): number {
  const safeInvestment = nonNegative(investment)
  if (safeInvestment <= 0) return 0
  return ((toFiniteNumber(returnAmount) - safeInvestment) / safeInvestment) * 100
}

export function calculatePaybackPeriodMonths(initialInvestment: unknown, monthlyCashFlow: unknown): number | null {
  const investment = nonNegative(initialInvestment)
  const cashFlow = nonNegative(monthlyCashFlow)
  if (investment <= 0) return 0
  if (cashFlow <= 0) return null
  return investment / cashFlow
}

export function calculateMortgageAnnuityPayment(principal: unknown, annualRatePercent: unknown, months: unknown): number {
  const safePrincipal = nonNegative(principal)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const monthlyRate = toFiniteNumber(annualRatePercent) / 100 / 12

  if (safePrincipal <= 0 || safeMonths <= 0) return 0
  if (monthlyRate === 0) return safePrincipal / safeMonths

  const factor = Math.pow(1 + monthlyRate, safeMonths)
  return safePrincipal * monthlyRate * factor / (factor - 1)
}

export function calculateLoanOverpayment(principal: unknown, annualRatePercent: unknown, months: unknown) {
  const payment = calculateMortgageAnnuityPayment(principal, annualRatePercent, months)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const safePrincipal = nonNegative(principal)
  const totalPaid = payment * safeMonths
  return {
    monthlyPayment: roundTo(payment),
    totalPaid: roundTo(totalPaid),
    overpayment: roundTo(Math.max(0, totalPaid - safePrincipal)),
  }
}

export function calculateDifferentiatedLoan(principal: unknown, annualRatePercent: unknown, months: unknown) {
  const safePrincipal = nonNegative(principal)
  const safeMonths = Math.max(0, Math.floor(nonNegative(months)))
  const monthlyRate = toFiniteNumber(annualRatePercent) / 100 / 12

  if (safePrincipal <= 0 || safeMonths <= 0) {
    return { firstPayment: 0, lastPayment: 0, totalPaid: 0, overpayment: 0 }
  }

  const principalPart = safePrincipal / safeMonths
  let totalPaid = 0
  let firstPayment = 0
  let lastPayment = 0

  for (let month = 0; month < safeMonths; month += 1) {
    const remainingPrincipal = safePrincipal - principalPart * month
    const payment = principalPart + remainingPrincipal * monthlyRate
    if (month === 0) firstPayment = payment
    if (month === safeMonths - 1) lastPayment = payment
    totalPaid += payment
  }

  return {
    firstPayment: roundTo(firstPayment),
    lastPayment: roundTo(lastPayment),
    totalPaid: roundTo(totalPaid),
    overpayment: roundTo(Math.max(0, totalPaid - safePrincipal)),
  }
}

export function calculateAveragePurchasePrice(
  currentQuantity: unknown,
  currentAveragePrice: unknown,
  additionalQuantity: unknown,
  additionalPrice: unknown,
): number {
  const quantity = nonNegative(currentQuantity)
  const averagePrice = nonNegative(currentAveragePrice)
  const nextQuantity = nonNegative(additionalQuantity)
  const nextPrice = nonNegative(additionalPrice)
  const totalQuantity = quantity + nextQuantity
  if (totalQuantity <= 0) return 0
  return (quantity * averagePrice + nextQuantity * nextPrice) / totalQuantity
}

export function calculateProfitLoss(quantity: unknown, buyPrice: unknown, sellPrice: unknown, fees: unknown = 0) {
  const safeQuantity = nonNegative(quantity)
  const cost = safeQuantity * nonNegative(buyPrice) + nonNegative(fees)
  const proceeds = safeQuantity * nonNegative(sellPrice)
  const pnl = proceeds - cost
  return {
    cost: roundTo(cost),
    proceeds: roundTo(proceeds),
    pnl: roundTo(pnl),
    pnlPercent: roundTo(safeDivide(pnl, cost) * 100),
  }
}

export function calculateDividendIncome(
  shares: unknown,
  dividendPerShare: unknown,
  taxRatePercent: unknown = 0,
  paymentsPerYear: unknown = 1,
) {
  const gross = nonNegative(shares) * nonNegative(dividendPerShare) * Math.max(1, Math.floor(nonNegative(paymentsPerYear, 1)))
  const tax = gross * (nonNegative(taxRatePercent) / 100)
  return {
    gross: roundTo(gross),
    tax: roundTo(tax),
    net: roundTo(gross - tax),
  }
}

export function calculatePositionValue(quantity: unknown, price: unknown): number {
  return nonNegative(quantity) * nonNegative(price)
}

export function calculateBreakEvenPrice(quantity: unknown, buyPrice: unknown, fees: unknown = 0): number {
  const safeQuantity = nonNegative(quantity)
  if (safeQuantity <= 0) return 0
  return nonNegative(buyPrice) + nonNegative(fees) / safeQuantity
}

export function calculateAllocationPercentage(positionValue: unknown, totalValue: unknown): number {
  return safeDivide(nonNegative(positionValue), nonNegative(totalValue)) * 100
}

export function calculateRiskPositionSize(
  accountSize: unknown,
  riskPercent: unknown,
  entryPrice: unknown,
  stopLossPrice: unknown,
) {
  const riskAmount = nonNegative(accountSize) * (nonNegative(riskPercent) / 100)
  const perUnitRisk = Math.abs(nonNegative(entryPrice) - nonNegative(stopLossPrice))
  const quantity = perUnitRisk > 0 ? riskAmount / perUnitRisk : 0
  const positionValue = quantity * nonNegative(entryPrice)

  return {
    riskAmount: roundTo(riskAmount),
    quantity: roundTo(quantity, 6),
    positionValue: roundTo(positionValue),
  }
}

export function calculateInvestmentProfitTax(profit: unknown, taxRatePercent: unknown) {
  const taxableProfit = Math.max(0, toFiniteNumber(profit))
  const tax = taxableProfit * (nonNegative(taxRatePercent) / 100)
  return {
    taxableProfit: roundTo(taxableProfit),
    tax: roundTo(tax),
    netProfit: roundTo(taxableProfit - tax),
  }
}

export function calculateRebalancingAmount(currentValue: unknown, targetPercent: unknown, totalPortfolioValue: unknown) {
  const current = nonNegative(currentValue)
  const targetValue = nonNegative(totalPortfolioValue) * (nonNegative(targetPercent) / 100)
  const difference = targetValue - current
  return {
    targetValue: roundTo(targetValue),
    difference: roundTo(difference),
    action: difference > 0 ? "buy" : difference < 0 ? "sell" : "hold",
  }
}
