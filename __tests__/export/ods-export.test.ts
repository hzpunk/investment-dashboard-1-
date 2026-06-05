import * as XLSX from "xlsx"
import { generateWorkbookExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("ODS export", () => {
  it("generates a non-empty ODS workbook with localized sheets", () => {
    const base = sampleExportBundle()
    const file = generateWorkbookExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "ods",
          language: "ru",
          selectedSections: ["portfolioSummary", "accounts"],
          options: { ...base.metadata.options, language: "ru" },
        },
      }),
      "ods",
    )
    const workbook = XLSX.read(file.body, { type: "buffer" })
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Счета"]!)

    expect(file.contentType).toBe("application/vnd.oasis.opendocument.spreadsheet")
    expect((file.body as Uint8Array).byteLength).toBeGreaterThan(500)
    expect(workbook.SheetNames).toEqual(expect.arrayContaining(["Сводка портфеля", "Счета"]))
    expect(JSON.stringify(rows)).toContain("Название")
    expect(JSON.stringify(rows)).not.toContain("createdAt")
    expect(JSON.stringify(rows)).not.toContain("assetId")
  })
})
