import { generateJsonExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("public JSON export", () => {
  it("uses stable public keys and excludes raw export internals by default", () => {
    const base = sampleExportBundle()
    const file = generateJsonExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "json",
          selectedSections: ["portfolioSummary", "accounts", "assets", "holdings", "transactions", "metadata"],
        },
      }),
    )
    const body = JSON.parse(String(file.body))
    const serialized = JSON.stringify(body)

    expect(body.portfolio.summary.portfolioValue).toBe(12500)
    expect(body.portfolio.summary.investedAmount).toBe(10000)
    expect(body.portfolio.summary.profitLoss).toBe(2500)
    expect(body.meta.applicationUrl).toBe("https://app.example.com")
    expect(body.meta.sections).toEqual(expect.arrayContaining(["Portfolio summary", "Accounts"]))
    expect(serialized).not.toContain("portfolioSummary")
    expect(serialized).not.toContain("totalPortfolioValue")
    expect(serialized).not.toContain("totalInvested")
    expect(serialized).not.toContain("totalPnL")
    expect(serialized).not.toContain("qrCodeDataUrl")
    expect(serialized).not.toContain("qrCodeSvg")
    expect(serialized).not.toContain("chartSnapshots")
    expect(serialized).not.toContain("projectionDefaults")
  })
})
