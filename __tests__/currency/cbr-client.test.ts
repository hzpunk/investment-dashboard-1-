jest.mock("server-only", () => ({}), { virtual: true })

import { formatCbrDate, parseCbrDailyXml } from "@/lib/currency/cbr-client"

describe("CBR XML client helpers", () => {
  it("formats date_req as dd/mm/yyyy", () => {
    expect(formatCbrDate(new Date("2026-06-06T12:00:00.000Z"))).toBe("06/06/2026")
  })

  it("parses CBR XML daily rates and nominal values", () => {
    const parsed = parseCbrDailyXml(`
      <ValCurs Date="06.06.2026" name="Foreign Currency Market">
        <Valute ID="R01235">
          <NumCode>840</NumCode>
          <CharCode>USD</CharCode>
          <Nominal>1</Nominal>
          <Name>US Dollar</Name>
          <Value>90,1234</Value>
        </Valute>
        <Valute ID="R01820">
          <NumCode>392</NumCode>
          <CharCode>JPY</CharCode>
          <Nominal>100</Nominal>
          <Name>Japanese Yen</Name>
          <Value>61,0000</Value>
        </Valute>
      </ValCurs>
    `)

    expect(parsed.source).toBe("CBR")
    expect(parsed.date).toBe("06.06.2026")
    expect(parsed.rates).toEqual([
      { base: "RUB", quote: "USD", nominal: 1, value: 90.1234, date: "06.06.2026", source: "CBR" },
      { base: "RUB", quote: "JPY", nominal: 100, value: 61, date: "06.06.2026", source: "CBR" },
    ])
  })
})

