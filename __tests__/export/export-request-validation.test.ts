import { normalizeExportRequest } from "@/lib/export/formatters"

const now = new Date("2026-06-04T10:00:00.000Z")

describe("export request validation", () => {
  it("accepts supported formats with selected sections", () => {
    const result = normalizeExportRequest({ format: "xlsx", sections: { transactions: true } }, now)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.request.format).toBe("xlsx")
      expect(result.request.sections.transactions).toBe(true)
    }
  })

  it("rejects missing body as validation error", () => {
    const result = normalizeExportRequest(null, now)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("rejects custom periods without valid dates", () => {
    const result = normalizeExportRequest({ format: "pdf", sections: { accounts: true }, period: { type: "custom" } }, now)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("rejects invalid language and orientation", () => {
    const language = normalizeExportRequest({ format: "pdf", sections: { accounts: true }, options: { language: "de" } }, now)
    const orientation = normalizeExportRequest({ format: "pdf", sections: { accounts: true }, options: { orientation: "square" } }, now)

    expect(language.ok).toBe(false)
    expect(orientation.ok).toBe(false)
  })

  it("rejects planned formats before generation", () => {
    const result = normalizeExportRequest({ format: "html", sections: { transactions: true } }, now)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("EXPORT_FORMAT_NOT_IMPLEMENTED")
  })

  it("accepts XLS, ODS, and XML formats", () => {
    for (const format of ["xls", "ods", "xml", "qif", "ofx", "mt940", "camt053"] as const) {
      const result = normalizeExportRequest({ format, sections: { transactions: true } }, now)
      expect(result.ok).toBe(true)
    }
  })
})
