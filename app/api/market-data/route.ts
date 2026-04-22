import { NextResponse } from "next/server"
import { getCryptoPrices, getStockPrice, cryptoIdMap } from "@/shared/api/market-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const symbol = searchParams.get("symbol")

  try {
    if (type === "crypto") {
      if (!symbol) {
        // Get all popular cryptos
        const popularCryptos = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"]
        const data = await getCryptoPrices(popularCryptos)
        return NextResponse.json({ data })
      } else {
        // Get specific crypto
        const geckoId = cryptoIdMap[symbol] || symbol.toLowerCase()
        const data = await getCryptoPrices([geckoId])
        return NextResponse.json({ data })
      }
    } else if (type === "stock" && symbol) {
      // Get stock price
      const data = await getStockPrice(symbol)
      return NextResponse.json({ data })
    } else {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error fetching market data:", error)
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 })
  }
}

