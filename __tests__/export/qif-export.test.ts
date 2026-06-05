import { generateQifExport } from "@/lib/export/generators/qif"
import { financialBundle, forbiddenFinancialLeaks } from "@/test-utils/financial-export-bundle"

describe("QIF export", () => {
  it("exports investment and bank transactions without internal fields", () => {
    const file = generateQifExport(financialBundle("qif"))
    const body = String(file.body)

    expect(file.contentType).toBe("application/qif; charset=utf-8")
    expect(file.filename.endsWith(".qif")).toBe(true)
    expect(body.charCodeAt(0)).toBe(0xfeff)
    expect(body).toContain("!Type:Invst")
    expect(body).toContain("D04.06.2026")
    expect(body).toContain("NBuy")
    expect(body).toContain("YAAPL")
    expect(body).toContain("Q20.00")
    expect(body).toContain("I175.00")
    expect(body).toContain("T-3500.00")
    expect(body).toContain("O1.00")
    expect(body).toContain("LDemo & <Main> Brokerage")
    expect(body).toContain("^")
    expect(body).toContain("!Type:Bank")
    expect(body).toContain("T50000.00")
    for (const leak of forbiddenFinancialLeaks) {
      expect(body).not.toContain(leak)
    }
  })
})
