import { csvEscape, normalizeExportRequest, rowsToCsv, stripSecrets } from "@/lib/export/formatters"
import { exportSectionKeys } from "@/lib/export/types"

describe("export formatters and validation", () => {
  it("rejects requests without selected sections", () => {
    const result = normalizeExportRequest({
      format: "pdf",
      sections: Object.fromEntries(exportSectionKeys.map((key) => [key, false])),
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("EXPORT_NO_SECTIONS_SELECTED")
  })

  it("rejects planned formats as not implemented", () => {
    const result = normalizeExportRequest({ format: "html", sections: { transactions: true } })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("EXPORT_FORMAT_NOT_IMPLEMENTED")
  })

  it("escapes CSV values with separator, quotes, and newlines", () => {
    expect(csvEscape('A;B \"C\"')).toBe('\"A;B \"\"C\"\"\"')
    expect(rowsToCsv([{ name: "Alpha;Beta", note: "line\nbreak" }])).toContain('\"line\nbreak\"')
  })

  it("removes secret-like keys recursively", () => {
    const sanitized = stripSecrets({
      email: "user@example.com",
      passwordHash: "hash",
      nested: { apiKey: "secret", value: 1 },
    })

    expect(sanitized).toEqual({ email: "user@example.com", nested: { value: 1 } })
  })
})
