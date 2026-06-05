import * as XLSX from "xlsx"
import { generateWorkbookExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("XLSX export headers", () => {
  it("uses localized sheet names and headers", () => {
    const base = sampleExportBundle()
    const file = generateWorkbookExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "xlsx",
          language: "ru",
          selectedSections: ["portfolioSummary", "accounts"],
          options: { ...base.metadata.options, language: "ru" },
        },
      }),
      "xlsx",
    )
    const workbook = XLSX.read(file.body, { type: "buffer" })
    const accountRows = XLSX.utils.sheet_to_json(workbook.Sheets["Счета"]!)
    const serialized = JSON.stringify(accountRows)

    expect(workbook.SheetNames).toEqual(expect.arrayContaining(["Сводка портфеля", "Счета"]))
    expect(serialized).toContain("Название")
    expect(serialized).toContain("Брокерский счёт")
    expect(serialized).not.toContain("createdAt")
  })
})
