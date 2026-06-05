import fs from "node:fs"
import { generatePdfExport, PDF_FONT_FILES } from "@/lib/export/generators/pdf"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("PDF font handling", () => {
  it("ships Cyrillic-capable Noto Sans TTF assets", () => {
    expect(fs.existsSync(PDF_FONT_FILES.regular)).toBe(true)
    expect(fs.existsSync(PDF_FONT_FILES.bold)).toBe(true)
    expect(fs.statSync(PDF_FONT_FILES.regular).size).toBeGreaterThan(100_000)
    expect(fs.statSync(PDF_FONT_FILES.bold).size).toBeGreaterThan(100_000)
  })

  it("generates a PDF with Russian text without ASCII replacement artifacts", async () => {
    const base = sampleExportBundle()
    const file = await generatePdfExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "pdf",
          title: "Инвестиционный отчёт",
          subtitle: "Портфель и доходность",
          language: "ru",
          options: { ...base.metadata.options, language: "ru" },
        },
      }),
    )
    const decoded = Buffer.from(file.body as Uint8Array).toString("latin1")

    expect(file.contentType).toBe("application/pdf")
    expect(decoded).not.toContain("GGGGGG")
    expect(decoded).not.toContain("AAAAAA")
    expect(decoded).not.toContain("??????")
  })
})
