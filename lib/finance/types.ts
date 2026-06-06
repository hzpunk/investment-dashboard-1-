export type AssetType = "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"

export type AllocationGroup = "type" | "asset" | "currency" | "sector"

export type FinanceTransactionType = "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal"

export type PortfolioAssetInput = {
  assetId: string
  symbol: string
  name: string
  type: AssetType | string
  quantity: number | null | undefined
  currentPrice: number | null | undefined
  averageBuyPrice?: number | null
  currency?: string | null
  sector?: string | null
  category?: string | null
  updatedAt?: Date | string | null
}

export type FinanceTransactionInput = {
  id?: string
  assetId?: string | null
  type: FinanceTransactionType | string
  quantity?: number | null
  pricePerUnit?: number | null
  totalAmount: number | null | undefined
  fee?: number | null
  currency?: string | null
  date: Date | string
  asset?: {
    id?: string | null
    symbol?: string | null
    name?: string | null
    type?: AssetType | string | null
    currentPrice?: number | null
    currency?: string | null
    updatedAt?: Date | string | null
  } | null
}

export type AccountBalanceInput = {
  balance: number | null | undefined
  currency?: string | null
}

export type PositionMetrics = {
  assetId: string
  symbol: string
  name: string
  type: AssetType
  quantity: number
  currentPrice: number
  averageBuyPrice: number
  marketValue: number
  costBasis: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  allocationPercent: number
  currency: string
  sector: string | null
  updatedAt: string | null
  isPriceMissing: boolean
  isPriceStale: boolean
}

export type AllocationItem = {
  key: string
  label: string
  value: number
  percent: number
  count: number
}

export type PortfolioRiskWarningCode =
  | "high_concentration"
  | "low_diversification"
  | "stale_prices"
  | "missing_prices"
  | "high_crypto_exposure"
  | "high_cash_share"

export type PortfolioRiskWarning = {
  code: PortfolioRiskWarningCode
  severity: "info" | "warning"
  value?: number
}

export type PortfolioRiskMetrics = {
  concentrationRisk: "low" | "medium" | "high"
  largestPositionShare: number
  diversificationScore: number
  cashShare: number
  cryptoShare: number
  stalePriceCount: number
  missingPriceCount: number
  warnings: PortfolioRiskWarning[]
}

export type PortfolioMetrics = {
  totalPortfolioValue: number
  cashBalance: number
  totalInvestedAmount: number
  unrealizedPnL: number
  realizedPnL: number | null
  totalPnL: number
  pnlPercent: number
  assetCount: number
  positions: PositionMetrics[]
  allocationByType: AllocationItem[]
  allocationByAsset: AllocationItem[]
  allocationByCurrency: AllocationItem[]
  allocationBySector: AllocationItem[]
  largestPosition: PositionMetrics | null
  largestPositionShare: number
  diversificationScore: number
  risk: PortfolioRiskMetrics
  updatedAt: string | null
}

export type PerformancePeriod = "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL"

export type PortfolioPerformancePoint = {
  date: string
  portfolioValue: number
  investedAmount: number
  pnl: number
  pnlPercent: number
}

export type ReturnMetrics = {
  simpleReturnPercent: number
  cumulativeReturnPercent: number
  annualizedReturnPercent: number | null
  cagrPercent: number | null
  averageMonthlyReturnPercent: number | null
  volatilityPercent: number | null
  maxDrawdownPercent: number | null
}

export type ProjectionPoint = {
  month: number
  date?: string
  value: number
  contributed: number
  interest: number
  inflationAdjustedValue: number
}

export type ProjectionScenario = {
  id: "conservative" | "base" | "optimistic"
  annualReturnPercent: number
  finalValue: number
  inflationAdjustedFinalValue: number
  points: ProjectionPoint[]
}

export type AnalyticsSummaryDto = {
  totalPortfolioValue: number
  totalInvested: number
  cashBalance: number
  unrealizedPnL: number
  realizedPnL: number | null
  totalPnL: number
  pnlPercent: number
  assetCount: number
  largestPosition: {
    symbol: string
    name: string
    type: string
    value: number
    percent: number
  } | null
  diversificationScore: number
  updatedAt: string | null
  source: "portfolio_assets" | "transactions" | "mixed" | "empty"
}

export type AnalyticsPerformanceDto = {
  points: PortfolioPerformancePoint[]
  byPeriod: Record<PerformancePeriod, PortfolioPerformancePoint[]>
  metrics: ReturnMetrics
  hasData: boolean
  emptyReason: "insufficient_data" | null
}

export type AnalyticsAllocationDto = {
  totalValue: number
  assetCount: number
  byType: AllocationItem[]
  byAsset: AllocationItem[]
  byCurrency: AllocationItem[]
  bySector: AllocationItem[]
}

export type AnalyticsTransactionStatsDto = {
  total: number
  buy: number
  sell: number
  dividend: number
  interest: number
  deposit: number
  withdrawal: number
  totalAmount: number
  totalFees: number
  periodStart: string
  periodEnd: string
}

export type AnalyticsProjectionDefaultsDto = {
  initialAmount: number
  monthlyContribution: number
  annualReturnPercent: number
  horizonYears: number
  inflationPercent: number
  scenarios: ProjectionScenario[]
}

export type AnalyticsDto = {
  summary: AnalyticsSummaryDto
  performance: AnalyticsPerformanceDto
  allocation: AnalyticsAllocationDto
  positions: PositionMetrics[]
  risk: PortfolioRiskMetrics
  transactionStats: AnalyticsTransactionStatsDto
  projectionDefaults: AnalyticsProjectionDefaultsDto
  period: {
    from: string
    to: string
  }
  currency: {
    baseCurrency: string
    conversionApplied: boolean
    conversionStatus: "not_required" | "converted" | "partial" | "unavailable"
    rateSource: "CBR"
    rateDate: string | null
    stale: boolean
    warnings: string[]
  }
  accountScope?: {
    type: "all" | "single"
    accountId: string | null
    key: string
  }
}
