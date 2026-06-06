export const displayCurrencyStorageKey = "investment-dashboard:display-currency"

export const supportedDisplayCurrencies = ["RUB", "USD", "EUR"] as const

export type DisplayCurrency = (typeof supportedDisplayCurrencies)[number]

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === "string" && supportedDisplayCurrencies.includes(value.toUpperCase() as DisplayCurrency)
}

export function normalizeDisplayCurrency(value: unknown, fallback: DisplayCurrency = "RUB"): DisplayCurrency {
  if (isDisplayCurrency(value)) return value.toUpperCase() as DisplayCurrency
  return fallback
}

export function defaultDisplayCurrencyForLocale(locale: string): DisplayCurrency {
  return locale === "ru" ? "RUB" : "USD"
}
