import { apiFetch } from "@/lib/api-client"

export type CurrencyRateRow = {
  currency: string
  nominal: number
  value: number
  rubPerUnit: number
  stale: boolean
}

export type CurrencyRatesDto = {
  base: "RUB"
  date: string
  dateFormatted: string
  source: "CBR"
  stale: boolean
  rates: CurrencyRateRow[]
}

export async function fetchCurrencyRates(symbols: string[] = ["USD", "EUR"]) {
  const query = new URLSearchParams()
  if (symbols.length > 0) query.set("symbols", symbols.join(","))
  const suffix = query.toString() ? `?${query.toString()}` : ""
  return apiFetch<CurrencyRatesDto>(`/api/currency/rates${suffix}`)
}
