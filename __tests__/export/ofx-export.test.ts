import { generateOfxExport } from "@/lib/export/generators/ofx"
import { financialBundle, forbiddenFinancialLeaks } from "@/test-utils/financial-export-bundle"

describe("OFX export", () => {
  it("exports OFX XML statement transactions with escaped values", () => {
    const file = generateOfxExport(financialBundle("ofx"))
    const body = String(file.body)

    expect(file.contentType).toBe("application/x-ofx; charset=utf-8")
    expect(file.filename.endsWith(".ofx")).toBe(true)
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(body).toContain("<OFX>")
    expect(body).toContain("<STMTTRN>")
    expect(body).toContain("<TRNTYPE>DEBIT</TRNTYPE>")
    expect(body).toContain("<TRNAMT>-3500.00</TRNAMT>")
    expect(body).toContain("<TRNTYPE>CREDIT</TRNTYPE>")
    expect(body).toContain("<TRNAMT>50000.00</TRNAMT>")
    expect(body).toContain("Demo &amp; &lt;Main&gt; Brokerage")
    expect(body).toContain("Apple &amp; &lt;Inc&gt;")
    for (const leak of forbiddenFinancialLeaks) {
      expect(body).not.toContain(leak)
    }
  })
})
