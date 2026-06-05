import { mapToExportViewModel } from "@/lib/export/presentation/export-view-model"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("export presentation mapping", () => {
  it("maps internal DTO fields to localized report labels", () => {
    const base = sampleExportBundle()
    const viewModel = mapToExportViewModel(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          language: "ru",
          selectedSections: ["portfolioSummary", "accounts", "assets", "holdings", "transactions", "metadata"],
          options: { ...base.metadata.options, language: "ru" },
        },
      }),
    )

    const serialized = JSON.stringify(viewModel.sections)
    expect(serialized).toContain("Сводка портфеля")
    expect(serialized).toContain("Стоимость портфеля")
    expect(serialized).toContain("Брокерский счёт")
    expect(serialized).toContain("Покупка")
    expect(serialized).not.toContain("totalPortfolioValue")
    expect(serialized).not.toContain("totalInvested")
    expect(serialized).not.toContain("createdAt")
    expect(serialized).not.toContain("currentPrice")
  })
})
