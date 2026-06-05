import { generateCamt053Export } from "@/lib/export/generators/camt053"
import { financialBundle, forbiddenFinancialLeaks } from "@/test-utils/financial-export-bundle"

describe("CAMT.053 export", () => {
  it("exports simplified ISO 20022 CAMT.053 XML statement", () => {
    const file = generateCamt053Export(financialBundle("camt053"))
    const body = String(file.body)

    expect(file.contentType).toBe("application/xml; charset=utf-8")
    expect(file.filename.endsWith(".xml")).toBe(true)
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(body).toContain('<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">')
    expect(body).toContain("<BkToCstmrStmt>")
    expect(body).toContain("<Ntry>")
    expect(body).toContain("<CdtDbtInd>DBIT</CdtDbtInd>")
    expect(body).toContain("<CdtDbtInd>CRDT</CdtDbtInd>")
    expect(body).toContain("<Ustrd>Покупка AAPL Apple &amp; &lt;Inc&gt;</Ustrd>")
    expect(body).toContain("<Id>Demo &amp; &lt;Main&gt; Brokerage</Id>")
    for (const leak of forbiddenFinancialLeaks) {
      expect(body).not.toContain(leak)
    }
  })
})
