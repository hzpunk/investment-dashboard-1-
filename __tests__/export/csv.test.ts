import { generateCsvExport, generateTxtExport, generateJsonExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("export text generators", () => {
  it("generates multi-section semicolon CSV", () => {
    const file = generateCsvExport(sampleExportBundle())

    expect(file.contentType).toContain("text/csv")
    expect(String(file.body)).toContain("Portfolio summary")
    expect(String(file.body)).toContain("Accounts")
    expect(String(file.body)).toContain("Portfolio value")
    expect(String(file.body)).not.toContain("totalPortfolioValue")
    expect(String(file.body)).toContain("AAPL")
  })

  it("generates human-readable TXT", () => {
    const file = generateTxtExport(sampleExportBundle())

    expect(file.filename.endsWith(".txt")).toBe(true)
    expect(String(file.body)).toContain("Investment report")
    expect(String(file.body)).toContain("Disclaimer")
  })

  it("generates structured JSON without secrets", () => {
    const file = generateJsonExport(sampleExportBundle({ user: { email: "user@example.com", username: "User", role: "user" } }))
    const parsed = JSON.parse(String(file.body))

    expect(parsed.meta.formatVersion).toBe("1.0")
    expect(parsed.portfolio.accounts[0].name).toBe("Brokerage")
    expect(JSON.stringify(parsed)).not.toMatch(/password|token|secret/i)
  })
})
