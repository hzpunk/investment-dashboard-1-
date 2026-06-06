export type CurrencyCode = "RUB" | "USD" | "EUR" | "CNY" | "GBP" | "CHF" | "JPY" | "CAD" | string

export type CurrencyRate = {
  base: "RUB"
  quote: string
  value: number
  nominal: number
  date: string
  source: "CBR"
}

export type CurrencyRatesResult = {
  date: string
  rates: CurrencyRate[]
  source: "CBR"
  stale: boolean
}

export type Money = {
  amount: number
  currency: CurrencyCode
}

export type ConvertedMoney = {
  original: Money
  converted: Money
  rate?: number
  rateDate?: string
  source?: "CBR" | "manual" | "same-currency"
  stale?: boolean
  unavailable?: boolean
  warning?: string
  error?: "RATE_UNAVAILABLE" | "CONVERSION_FAILED"
}

export type SumMoneyResult = {
  total: Money
  items: ConvertedMoney[]
  status: "same-currency" | "converted" | "partial" | "unavailable"
  failedCount: number
  convertedCount: number
}
