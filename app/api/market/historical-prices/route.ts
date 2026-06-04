import { getHistoricalPricesServer } from "@/lib/services/market-data"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

const allowedTypes = new Set(["stock", "crypto"])
const allowedPeriods = new Set(["1M", "3M", "6M", "1Y", "ALL"])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol") ?? "BTC").trim()
  const type = searchParams.get("type") ?? "crypto"
  const period = searchParams.get("period") ?? "1M"

  if (!symbol) {
    return apiError(ApiErrorCode.VALIDATION_ERROR, "Invalid symbol", { status: 400 })
  }

  if (!allowedTypes.has(type) || !allowedPeriods.has(period)) {
    return apiError(ApiErrorCode.VALIDATION_ERROR, "Invalid market data request", { status: 400 })
  }

  const result = await getHistoricalPricesServer(
    symbol,
    type as "stock" | "crypto",
    period as "1M" | "3M" | "6M" | "1Y" | "ALL",
  )
  return apiSuccess(result)
}
