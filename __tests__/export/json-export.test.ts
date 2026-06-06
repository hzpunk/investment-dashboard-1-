import { generateJsonExport } from "@/lib/export/generators/tabular"
import type { AnalyticsDto } from "@/lib/finance"
import { sampleExportBundle } from "@/test-utils/export-bundle"

const analytics: AnalyticsDto = {
  summary: sampleExportBundle().portfolioSummary!,
  performance: {
    points: [
      { date: "2026-06-01T00:00:00.000Z", portfolioValue: 1000, investedAmount: 900, pnl: 100, pnlPercent: 11.11 },
      { date: "2026-06-04T00:00:00.000Z", portfolioValue: 1200, investedAmount: 950, pnl: 250, pnlPercent: 26.32 },
    ],
    byPeriod: { "7D": [], "1M": [], "3M": [], "6M": [], "1Y": [], ALL: [] },
    metrics: {
      simpleReturnPercent: 20,
      cumulativeReturnPercent: 20,
      annualizedReturnPercent: null,
      cagrPercent: null,
      averageMonthlyReturnPercent: null,
      volatilityPercent: null,
      maxDrawdownPercent: null,
    },
    hasData: true,
    emptyReason: null,
  },
  allocation: {
    totalValue: 1200,
    assetCount: 1,
    byType: [],
    byAsset: [{ key: "AAPL", label: "AAPL", value: 1200, percent: 100, count: 1 }],
    byCurrency: [],
    bySector: [],
  },
  positions: [],
  risk: {
    concentrationRisk: "high",
    largestPositionShare: 100,
    diversificationScore: 10,
    cryptoShare: 0,
    cashShare: 0,
    stalePriceCount: 0,
    missingPriceCount: 0,
    warnings: [],
  },
  transactionStats: {
    total: 0,
    buy: 0,
    sell: 0,
    dividend: 0,
    interest: 0,
    deposit: 0,
    withdrawal: 0,
    totalAmount: 0,
    totalFees: 0,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-04T00:00:00.000Z",
  },
  projectionDefaults: {
    initialAmount: 1000,
    monthlyContribution: 100,
    annualReturnPercent: 8,
    horizonYears: 1,
    inflationPercent: 4,
    scenarios: [
      {
        id: "optimistic",
        annualReturnPercent: 10,
        finalValue: 191181.19,
        inflationAdjustedFinalValue: 128237.86,
        points: [{ month: 1, value: 1100, contributed: 100, interest: 10, inflationAdjustedValue: 1096 }],
      },
    ],
  },
  period: {
    from: "2026-06-01T00:00:00.000Z",
    to: "2026-06-04T00:00:00.000Z",
  },
  currency: {
    baseCurrency: "USD",
    conversionApplied: false,
    conversionStatus: "not_required",
    rateSource: "CBR",
    rateDate: null,
    stale: false,
    warnings: [],
  },
}

describe("JSON export", () => {
  it("excludes projection point arrays by default", () => {
    const file = generateJsonExport(sampleExportBundle({ analytics, metadata: { ...sampleExportBundle().metadata, format: "json" } }))
    const body = JSON.parse(String(file.body))

    expect(body.meta.generatedAtFormatted).toBe("06.04.2026 10:00")
    expect(body.analytics.projectionSummary[0]).not.toHaveProperty("points")
    expect(JSON.stringify(body)).not.toContain("\"projectionDetails\"")
    expect(JSON.stringify(body)).not.toContain("qrCodeDataUrl")
    expect(JSON.stringify(body)).not.toContain("chartSnapshots")
  })

  it("includes projection point arrays in detailed mode", () => {
    const base = sampleExportBundle()
    const file = generateJsonExport(
      sampleExportBundle({
        analytics,
        metadata: {
          ...base.metadata,
          format: "json",
          options: { ...base.metadata.options, detailedMode: true },
        },
      }),
    )
    const body = JSON.parse(String(file.body))

    expect(body.technical.projectionDetails.scenarios[0].points).toHaveLength(1)
  })
})
