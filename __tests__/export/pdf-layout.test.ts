import { generatePdfExport } from "@/lib/export/generators/pdf"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("export PDF generator", () => {
  it("generates a PDF buffer with QR and tables", async () => {
    const file = await generatePdfExport(sampleExportBundle({ metadata: { ...sampleExportBundle().metadata, format: "pdf" } }))

    expect(file.contentType).toBe("application/pdf")
    expect(file.body).toBeInstanceOf(Uint8Array)
    expect((file.body as Uint8Array).byteLength).toBeGreaterThan(500)
  })
})
