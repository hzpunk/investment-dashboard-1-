import { sumMoneyInCurrency } from "@/lib/currency/money"
import type { CurrencyRate } from "@/lib/currency/types"

const rates: CurrencyRate[] = [
  { base: "RUB", quote: "USD", value: 90, nominal: 1, date: "2026-06-06", source: "CBR" },
  { base: "RUB", quote: "EUR", value: 100, nominal: 1, date: "2026-06-06", source: "CBR" },
]

describe("sumMoneyInCurrency", () => {
  it("sums USD and RUB in RUB after conversion", () => {
    const result = sumMoneyInCurrency(
      [
        { amount: 21588.75, currency: "USD" },
        { amount: 100000, currency: "RUB" },
      ],
      "RUB",
      rates,
    )

    expect(result.total).toEqual({ amount: 2042987.5, currency: "RUB" })
    expect(result.status).toBe("converted")
  })

  it("sums USD and EUR in USD through RUB", () => {
    const result = sumMoneyInCurrency(
      [
        { amount: 100, currency: "USD" },
        { amount: 100, currency: "EUR" },
      ],
      "USD",
      rates,
    )

    expect(result.total.amount).toBeCloseTo(211.11, 2)
    expect(result.total.currency).toBe("USD")
  })

  it("does not include missing-rate values in the converted sum", () => {
    const result = sumMoneyInCurrency(
      [
        { amount: 100, currency: "CHF" },
        { amount: 1000, currency: "RUB" },
      ],
      "RUB",
      rates,
    )

    expect(result.total).toEqual({ amount: 1000, currency: "RUB" })
    expect(result.status).toBe("partial")
    expect(result.failedCount).toBe(1)
  })
})
