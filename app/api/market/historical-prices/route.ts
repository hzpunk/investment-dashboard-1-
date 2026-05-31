import { NextResponse } from "next/server"
import { getHistoricalPricesServer } from "@/lib/services/market-data"

const allowedTypes = new Set(["stock", "crypto"])
const allowedPeriods = new Set(["1M", "3M", "6M", "1Y", "ALL"])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol") ?? "BTC").trim()
  const type = searchParams.get("type") ?? "crypto"
  const period = searchParams.get("period") ?? "1M"

  if (!symbol) {
    return NextResponse.json(
      { success: false, data: [], source: "fallback", warning: "invalid_symbol" },
      { status: 400 },
    )
  }

  if (!allowedTypes.has(type) || !allowedPeriods.has(period)) {
    return NextResponse.json(
      { success: false, data: [], source: "fallback", warning: "invalid_market_data_request" },
      { status: 400 },
    )
  }

  const result = await getHistoricalPricesServer(
    symbol,
    type as "stock" | "crypto",
    period as "1M" | "3M" | "6M" | "1Y" | "ALL",
  )
  return NextResponse.json(result)
}
