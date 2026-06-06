import { generateCsvExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("CSV export headers", () => {
  it("uses Russian user-facing headers", () => {
    const base = sampleExportBundle()
    const file = generateCsvExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "csv",
          language: "ru",
          selectedSections: ["accounts"],
          options: { ...base.metadata.options, language: "ru" },
        },
      }),
    )

    const body = String(file.body)
    expect(body).toContain("Счета")
    expect(body).toContain("Название;Тип;Баланс в валюте счёта;Валюта счёта;Валюта отображения;Дата создания")
    expect(body).toContain("Брокерский счёт")
    expect(body).not.toContain("name;type;balance;currency;createdAt")
  })
})
