import { convertMoney, rubPerUnit } from "@/lib/currency/conversion"
import type { CurrencyRate } from "@/lib/currency/types"

const rates: CurrencyRate[] = [
  { base: "RUB", quote: "USD", value: 9000, nominal: 100, date: "06.06.2026", source: "CBR" },
  { base: "RUB", quote: "EUR", value: 100, nominal: 1, date: "06.06.2026", source: "CBR" },
]

describe("currency conversion", () => {
  it("handles CBR nominal values", () => {
    expect(rubPerUnit(rates[0])).toBe(90)
  })

  it("converts foreign currency to RUB", () => {
    const converted = convertMoney({ amount: 10, currency: "USD" }, "RUB", rates)
    expect(converted.converted).toEqual({ amount: 900, currency: "RUB" })
    expect(converted.rate).toBe(90)
  })

  it("converts RUB to foreign currency", () => {
    const converted = convertMoney({ amount: 900, currency: "RUB" }, "USD", rates)
    expect(converted.converted.amount).toBe(10)
    expect(converted.converted.currency).toBe("USD")
  })

  it("converts through RUB between foreign currencies", () => {
    const converted = convertMoney({ amount: 100, currency: "USD" }, "EUR", rates)
    expect(converted.converted.amount).toBe(90)
  })

  it("does not fake missing rates", () => {
    const converted = convertMoney({ amount: 100, currency: "CHF" }, "RUB", rates)
    expect(converted.error).toBe("RATE_UNAVAILABLE")
  })
})

