import { generateMt940Export } from "@/lib/export/generators/mt940"
import { financialBundle, forbiddenFinancialLeaks } from "@/test-utils/financial-export-bundle"

describe("MT940 export", () => {
  it("exports simplified MT940 statement with mandatory tags", () => {
    const file = generateMt940Export(financialBundle("mt940"))
    const body = String(file.body)

    expect(file.contentType).toBe("text/plain; charset=utf-8")
    expect(file.filename.endsWith(".sta")).toBe(true)
    expect(body).toContain(":20:")
    expect(body).toContain(":25:INVESTTRACK/Demo & <Main> Brokerage")
    expect(body).toContain(":60F:")
    expect(body).toContain(":61:260604260604D3500,00")
    expect(body).toContain(":61:260605260605C50000,00")
    expect(body).toContain(":86:Покупка AAPL Apple & <Inc>")
    expect(body).toContain(":62F:")
    expect(body.trim().endsWith("-")).toBe(true)
    for (const leak of forbiddenFinancialLeaks) {
      expect(body).not.toContain(leak)
    }
  })
})
