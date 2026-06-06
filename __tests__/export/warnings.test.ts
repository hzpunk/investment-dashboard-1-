import { buildExportSummary } from "@/lib/export/formatters"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("export summary warnings", () => {
  it("does not show a chart warning for PDF when chart data exists", () => {
    const base = sampleExportBundle()
    const summary = buildExportSummary(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "pdf",
          selectedSections: ["allocationChart", "performanceChart", "metadata"],
        },
        allocationChart: {
          totalValue: 1000,
          assetCount: 1,
          byType: [],
          byAsset: [{ key: "AAPL", label: "AAPL", value: 1000, percent: 100, count: 1 }],
          byCurrency: [],
          bySector: [],
        },
        performanceChart: {
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
      }),
    )

    expect(summary.warnings.map((warning) => warning.code)).not.toContain("CHARTS_AS_TABLE")
    expect(summary.warnings.map((warning) => warning.code)).not.toContain("FORMAT_DOES_NOT_SUPPORT_CHARTS")
  })

  it("warns only for selected charts without data", () => {
    const base = sampleExportBundle()
    const summary = buildExportSummary(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "pdf",
          selectedSections: ["allocationChart", "metadata"],
        },
        allocationChart: { totalValue: 0, assetCount: 0, byType: [], byAsset: [], byCurrency: [], bySector: [] },
      }),
    )

    expect(summary.warnings).toContainEqual({ code: "NO_DATA_FOR_SECTION", section: "allocationChart" })
  })

  it("warns that JSON is compact when detailed projection data exists", () => {
    const base = sampleExportBundle()
    const summary = buildExportSummary(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "json",
          selectedSections: ["analytics", "metadata"],
        },
        analytics: {
          summary: base.portfolioSummary!,
          performance: {
            points: [],
            byPeriod: { "7D": [], "1M": [], "3M": [], "6M": [], "1Y": [], ALL: [] },
            metrics: {
              simpleReturnPercent: 0,
              cumulativeReturnPercent: 0,
              annualizedReturnPercent: null,
              cagrPercent: null,
              averageMonthlyReturnPercent: null,
              volatilityPercent: null,
              maxDrawdownPercent: null,
            },
            hasData: false,
            emptyReason: "insufficient_data",
          },
          allocation: { totalValue: 0, assetCount: 0, byType: [], byAsset: [], byCurrency: [], bySector: [] },
          positions: [],
          risk: {
            concentrationRisk: "low",
            largestPositionShare: 0,
            diversificationScore: 100,
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
            initialAmount: 0,
            monthlyContribution: 0,
            annualReturnPercent: 0,
            horizonYears: 1,
            inflationPercent: 0,
            scenarios: [{ id: "base", annualReturnPercent: 8, finalValue: 1, inflationAdjustedFinalValue: 1, points: [] }],
          },
          period: { from: "2026-06-01T00:00:00.000Z", to: "2026-06-04T00:00:00.000Z" },
          currency: {
            baseCurrency: "USD",
            conversionApplied: false,
            conversionStatus: "not_required",
            rateSource: "CBR",
            rateDate: null,
            stale: false,
            warnings: [],
          },
        },
      }),
    )

    expect(summary.warnings).toContainEqual({ code: "COMPACT_JSON", format: "json" })
  })
})
