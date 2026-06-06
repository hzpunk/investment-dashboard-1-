import { convertMoney, convertMoneyStrict } from "@/lib/currency/money"
import type { CurrencyRate } from "@/lib/currency/types"

const rates: CurrencyRate[] = [
  { base: "RUB", quote: "USD", value: 90, nominal: 1, date: "2026-06-06", source: "CBR" },
  { base: "RUB", quote: "EUR", value: 100, nominal: 1, date: "2026-06-06", source: "CBR" },
]

describe("money conversion regression", () => {
  it("converts 21588.75 USD to RUB numerically", () => {
    const converted = convertMoney({ amount: 21588.75, currency: "USD" }, "RUB", rates)
    expect(converted.converted).toEqual({ amount: 1942987.5, currency: "RUB" })
    expect(converted.original).toEqual({ amount: 21588.75, currency: "USD" })
    expect(converted.source).toBe("CBR")
  })

  it("keeps same currency amounts unchanged", () => {
    const converted = convertMoney({ amount: 21588.75, currency: "USD" }, "USD", rates)
    expect(converted.converted).toEqual({ amount: 21588.75, currency: "USD" })
    expect(converted.source).toBe("same-currency")
  })

  it("converts RUB to foreign currency", () => {
    const converted = convertMoney({ amount: 100000, currency: "RUB" }, "USD", rates)
    expect(converted.converted.amount).toBeCloseTo(1111.11, 2)
    expect(converted.converted.currency).toBe("USD")
  })

  it("converts foreign currencies through RUB", () => {
    const converted = convertMoney({ amount: 100, currency: "EUR" }, "USD", rates)
    expect(converted.converted.amount).toBeCloseTo(111.11, 2)
  })

  it("marks missing rates unavailable instead of relabeling", () => {
    const converted = convertMoney({ amount: 100, currency: "CHF" }, "RUB", rates)
    expect(converted.error).toBe("RATE_UNAVAILABLE")
    expect(converted.unavailable).toBe(true)
    expect(converted.converted).toEqual({ amount: 0, currency: "RUB" })
  })

  it("strict conversion throws when rates are missing", () => {
    expect(() => convertMoneyStrict({ amount: 100, currency: "CHF" }, "RUB", rates)).toThrow("RATE_UNAVAILABLE")
  })
})
