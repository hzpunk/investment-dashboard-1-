import { NextResponse } from "next/server"
import { cryptoIdMap, getCryptoPricesServer, getStockPriceServer } from "@/lib/services/market-data"

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
        return NextResponse.json(result)
      } else {
        // Get specific crypto
        const geckoId = cryptoIdMap[symbol.toUpperCase()] || symbol.toLowerCase()
        const result = await getCryptoPricesServer([geckoId])
        return NextResponse.json(result)
      }
    } else if (type === "stock" && symbol) {
      // Get stock price
      const result = await getStockPriceServer(symbol)
      return NextResponse.json(result)
    } else {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 })
  }
}

