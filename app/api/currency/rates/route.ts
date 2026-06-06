import { NextRequest } from "next/server"
import { withAuth } from "@/lib/api-handler"
import { apiError, apiSuccess } from "@/lib/api-response"
import { ApiErrorCode } from "@/lib/api-errors"
import { getCbrCurrencyRates } from "@/lib/currency/rates"
import { rubPerUnit } from "@/lib/currency/conversion"

export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const symbolsParam = searchParams.get("symbols")
  const requestedSymbols = symbolsParam
    ? new Set(symbolsParam.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))
    : null
  const date = dateParam ? new Date(dateParam) : new Date()

  if (Number.isNaN(date.getTime())) {
    return apiError(ApiErrorCode.VALIDATION_ERROR, "Invalid currency rate date", { status: 400 })
  }

  const result = await getCbrCurrencyRates(date)
  if (!result) {
    return apiError(ApiErrorCode.CURRENCY_RATE_UNAVAILABLE, "Currency rates are unavailable", { status: 503 })
  }

  const rates = result.rates
    .filter((rate) => !requestedSymbols || requestedSymbols.has(rate.quote.toUpperCase()))
    .map((rate) => ({
      currency: rate.quote.toUpperCase(),
      nominal: rate.nominal,
      value: rate.value,
      rubPerUnit: rubPerUnit(rate) ?? 0,
      stale: result.stale,
    }))

  return apiSuccess({
    base: "RUB",
    date: formatRateDate(result.date),
    dateFormatted: result.date,
    source: result.source,
    stale: result.stale,
    rates,
  })
})

function formatRateDate(value: string) {
  const cbrMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (cbrMatch) return `${cbrMatch[3]}-${cbrMatch[2]}-${cbrMatch[1]}`
  return value
}
