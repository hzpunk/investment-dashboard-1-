import { fullyImplementedExportFormats, getExportFormatStatus, plannedExportFormats } from "@/lib/export/types"

describe("export format support", () => {
  it("enables only tested export formats", () => {
    expect([...fullyImplementedExportFormats]).toEqual([
      "pdf",
      "docx",
      "txt",
      "csv",
      "xlsx",
      "xls",
      "ods",
      "json",
      "xml",
      "qif",
      "ofx",
      "mt940",
      "camt053",
    ])
  })

  it("marks not-yet-stabilized formats as planned", () => {
    expect([...plannedExportFormats]).toEqual(["html"])
    for (const format of plannedExportFormats) {
      expect(getExportFormatStatus(format)).toBe("planned")
    }
  })

  it("marks financial formats as supported", () => {
    for (const format of ["qif", "ofx", "mt940", "camt053"] as const) {
      expect(getExportFormatStatus(format)).toBe("supported")
    }
  })
})
