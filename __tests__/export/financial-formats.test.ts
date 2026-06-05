import { buildExportSummary } from "@/lib/export/formatters"
import { generateExportFile } from "@/lib/export/generators"
import { getExportFormatDefinition, getExportFormatStatus } from "@/lib/export/types"
import { financialBundle } from "@/test-utils/financial-export-bundle"

describe("financial export formats", () => {
  it("marks all financial formats as implemented in the shared registry", () => {
    expect(getExportFormatStatus("qif")).toBe("supported")
    expect(getExportFormatStatus("ofx")).toBe("supported")
    expect(getExportFormatStatus("mt940")).toBe("supported")
    expect(getExportFormatStatus("camt053")).toBe("supported")
    expect(getExportFormatDefinition("qif").mimeType).toBe("application/qif; charset=utf-8")
    expect(getExportFormatDefinition("ofx").mimeType).toBe("application/x-ofx; charset=utf-8")
    expect(getExportFormatDefinition("mt940").mimeType).toBe("text/plain; charset=utf-8")
    expect(getExportFormatDefinition("camt053").mimeType).toBe("application/xml; charset=utf-8")
  })

  it("dispatches financial generators with correct MIME types", async () => {
    const expected = {
      qif: "application/qif; charset=utf-8",
      ofx: "application/x-ofx; charset=utf-8",
      mt940: "text/plain; charset=utf-8",
      camt053: "application/xml; charset=utf-8",
    } as const

    for (const format of Object.keys(expected) as Array<keyof typeof expected>) {
      const file = await generateExportFile(format, financialBundle(format))
      expect(file.contentType).toBe(expected[format])
      expect(String(file.body).length || (file.body as Uint8Array).byteLength).toBeGreaterThan(20)
    }
  })

  it("warns that visual/report sections are skipped for financial formats", () => {
    const summary = buildExportSummary(financialBundle("ofx"))

    expect(summary.warnings).toContainEqual({ code: "FINANCIAL_SECTIONS_ONLY", format: "ofx" })
  })
})
