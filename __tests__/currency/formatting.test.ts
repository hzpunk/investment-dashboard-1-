import { defaultCurrencyForLocale, formatCurrencyName, formatMoney, normalizeCurrencyCode } from "@/lib/currency/formatting"

describe("currency formatting", () => {
  it("uses RUB as Russian default currency", () => {
    expect(defaultCurrencyForLocale("ru")).toBe("RUB")
    expect(defaultCurrencyForLocale("en")).toBe("USD")
  })

  it("formats Russian ruble labels and amounts", () => {
    expect(formatCurrencyName("RUB", "ru")).toBe("Российский рубль")
    expect(formatCurrencyName("USD", "ru")).toBe("Доллар США")
    expect(formatCurrencyName("EUR", "ru")).toBe("Евро")
    expect(formatCurrencyName("RUB", "en")).toBe("Russian ruble")
    expect(formatMoney(1234.5, "RUB", "ru")).toContain("₽")
  })

  it("formats USD and EUR without hardcoded symbols", () => {
    expect(formatMoney(1234.5, "USD", "en")).toContain("$")
    expect(formatMoney(1234.5, "EUR", "en")).toContain("€")
  })

  it("normalizes currency codes", () => {
    expect(normalizeCurrencyCode(" rub ")).toBe("RUB")
    expect(normalizeCurrencyCode(null)).toBe("RUB")
  })
})
