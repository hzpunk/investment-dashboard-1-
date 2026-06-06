import type { CurrencyCode } from "@/lib/currency/types"

export const supportedCurrencies = ["RUB", "USD", "EUR", "GBP", "JPY", "CAD", "CNY"] as const

export function defaultCurrencyForLocale(locale: string) {
  return locale === "ru" ? "RUB" : "USD"
}

export function normalizeCurrencyCode(currency: unknown, fallback = "RUB"): CurrencyCode {
  const normalized = typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : fallback
  return normalized.slice(0, 12)
}

export function formatCurrencyName(currency: string, locale: "ru" | "en") {
  const labels: Record<string, { ru: string; en: string }> = {
    RUB: { ru: "Российский рубль", en: "Russian ruble" },
    USD: { ru: "Доллар США", en: "US dollar" },
    EUR: { ru: "Евро", en: "Euro" },
    GBP: { ru: "Фунт стерлингов", en: "Pound sterling" },
    JPY: { ru: "Японская иена", en: "Japanese yen" },
    CAD: { ru: "Канадский доллар", en: "Canadian dollar" },
    CNY: { ru: "Китайский юань", en: "Chinese yuan" },
  }
  return labels[currency]?.[locale] ?? currency
}

export function formatMoney(value: number, currency = "RUB", locale: "ru" | "en" = "ru") {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: normalizeCurrencyCode(currency, "RUB"),
    maximumFractionDigits: 2,
  }).format(safeValue)
}

export function formatMoneyWithApproximation(
  original: { amount: number; currency: string },
  converted: { amount: number; currency: string },
  locale: "ru" | "en",
) {
  const primary = formatMoney(converted.amount, converted.currency, locale)
  if (original.currency.toUpperCase() === converted.currency.toUpperCase()) return primary
  return `${primary} ≈ ${formatMoney(original.amount, original.currency, locale)}`
}
