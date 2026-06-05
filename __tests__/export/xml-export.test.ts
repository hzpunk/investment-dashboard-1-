import { generateXmlExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("XML export", () => {
  it("generates clean public XML with escaped values and no internal export payloads", () => {
    const base = sampleExportBundle()
    const file = generateXmlExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "xml",
          language: "ru",
          selectedSections: ["portfolioSummary", "accounts", "assets", "holdings", "transactions", "allocationChart", "metadata"],
          options: { ...base.metadata.options, language: "ru" },
        },
        accounts: [{ name: "Demo & <Main> \"Brokerage\"", type: "brokerage", balance: 500, currency: "USD", createdAt: "2026-01-01T00:00:00.000Z" }],
        allocationChart: {
          totalValue: 100,
          assetCount: 1,
          byType: [],
          byAsset: [{ key: "cmpzng1cv0003rk28vwl9a6cq", label: "BTC", value: 100, percent: 100, count: 1 }],
          byCurrency: [],
          bySector: [],
        },
      }),
    )
    const xml = String(file.body)

    expect(file.contentType).toBe("application/xml; charset=utf-8")
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<investmentReport version="1.0" language="ru">')
    expect(xml).toContain("<portfolioValue currency=\"USD\">12500</portfolioValue>")
    expect(xml).toContain("<type>Брокерский счёт</type>")
    expect(xml).toContain("Demo &amp; &lt;Main&gt; &quot;Brokerage&quot;")
    expect(xml).not.toContain("totalPortfolioValue")
    expect(xml).not.toContain("totalInvested")
    expect(xml).not.toContain("assetId")
    expect(xml).not.toContain("portfolioId")
    expect(xml).not.toContain("accountId")
    expect(xml).not.toContain("userId")
    expect(xml).not.toContain("cmpzng1cv0003rk28vwl9a6cq")
    expect(xml).not.toContain("qrCodeDataUrl")
    expect(xml).not.toContain("qrCodeSvg")
    expect(xml).not.toContain("projectionDefaults")
  })
})
