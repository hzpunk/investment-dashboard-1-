import * as XLSX from "xlsx"
import { generateWorkbookExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("export workbook generator", () => {
  it("generates XLSX workbook with multiple sheets", () => {
    const file = generateWorkbookExport(sampleExportBundle(), "xlsx")
    const workbook = XLSX.read(file.body, { type: "buffer" })

    expect(file.contentType).toContain("spreadsheetml")
    expect(workbook.SheetNames).toEqual(expect.arrayContaining(["Portfolio summary", "Accounts", "Holdings", "Transactions"]))
    const summaryRows = XLSX.utils.sheet_to_json(workbook.Sheets["Portfolio summary"]!)
    expect(JSON.stringify(summaryRows)).toContain("Portfolio value")
    expect(JSON.stringify(summaryRows)).not.toContain("totalPortfolioValue")
  })
})
