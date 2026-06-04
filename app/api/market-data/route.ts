import { cryptoIdMap, getCryptoPricesServer, getStockPriceServer } from "@/lib/services/market-data"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const symbol = searchParams.get("symbol")

  try {
    if (type === "crypto") {
      if (!symbol) {
        // Get all popular cryptos
        const popularCryptos = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"]
        const result = await getCryptoPricesServer(popularCryptos)
        return apiSuccess(result)
      } else {
        // Get specific crypto
        const geckoId = cryptoIdMap[symbol.toUpperCase()] || symbol.toLowerCase()
        const result = await getCryptoPricesServer([geckoId])
        return apiSuccess(result)
      }
    } else if (type === "stock" && symbol) {
      // Get stock price
      const result = await getStockPriceServer(symbol)
      return apiSuccess(result)
    } else {
      return apiError(ApiErrorCode.VALIDATION_ERROR, "Invalid parameters", { status: 400 })
    }
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL_ERROR, "Failed to fetch market data", { status: 500 })
  }
}

