import * as XLSX from "xlsx"
import { generateWorkbookExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("legacy XLS export", () => {
  it("generates a true XLS workbook buffer with sanitized presentation data", () => {
    const base = sampleExportBundle()
    const file = generateWorkbookExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "xls",
          language: "ru",
          selectedSections: ["portfolioSummary", "accounts", "allocationChart"],
          options: { ...base.metadata.options, language: "ru" },
        },
        allocationChart: {
          totalValue: 100,
          assetCount: 1,
          byType: [],
          byAsset: [{ key: "cmpzng1cv0003rk28vwl9a6cq", label: "BTC", value: 100, percent: 100, count: 1 }],
          byCurrency: [],
          bySector: [],
        },
      }),
      "xls",
    )
    const bytes = file.body as Uint8Array
    const workbook = XLSX.read(bytes, { type: "buffer" })
    const summaryRows = XLSX.utils.sheet_to_json(workbook.Sheets["Сводка портфеля"]!)
    const accountRows = XLSX.utils.sheet_to_json(workbook.Sheets["Счета"]!)
    const renderedRows = JSON.stringify([...summaryRows, ...accountRows])

    expect(file.filename.endsWith(".xls")).toBe(true)
    expect(file.contentType).toBe("application/vnd.ms-excel")
    expect(bytes.byteLength).toBeGreaterThan(500)
    expect(workbook.SheetNames).toEqual(expect.arrayContaining(["Сводка портфеля", "Счета", "Распределение активов"]))
    expect(renderedRows).toContain("Стоимость портфеля")
    expect(renderedRows).toContain("Брокерский счёт")
    expect(renderedRows).not.toContain("totalPortfolioValue")
    expect(renderedRows).not.toContain("assetId")
    expect(renderedRows).not.toContain("cmpzng1cv0003rk28vwl9a6cq")
  })
})
