import { generatePdfExport } from "@/lib/export/generators/pdf"
import { tableSections } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

const forbiddenRawKeys = [
  "totalPortfolioValue",
  "totalInvested",
  "cashBalance",
  "totalPnL",
  "pnlPercent",
  "createdAt",
  "currentPrice",
  "assetId",
  "key",
]

describe("PDF export labels", () => {
  it("feeds the PDF renderer localized report sections instead of raw DTO tables", async () => {
    const base = sampleExportBundle()
    const bundle = sampleExportBundle({
      metadata: {
        ...base.metadata,
        format: "pdf",
        language: "ru",
        selectedSections: ["portfolioSummary", "accounts", "assets", "holdings", "transactions"],
        options: { ...base.metadata.options, language: "ru" },
      },
    })
    const sections = tableSections(bundle)
    const renderedModel = JSON.stringify(
      sections.map((section) => ({
        title: section.title,
        summaryItems: section.summaryItems,
        rows: section.rows,
      })),
    )
    const file = await generatePdfExport(bundle)

    expect(file.contentType).toBe("application/pdf")
    expect(renderedModel).toContain("Сводка портфеля")
    expect(renderedModel).toContain("Стоимость портфеля")
    expect(renderedModel).toContain("Текущая цена")
    for (const key of forbiddenRawKeys) {
      expect(renderedModel).not.toContain(key)
    }
  })
})
