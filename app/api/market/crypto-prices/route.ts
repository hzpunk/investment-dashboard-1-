import { NextResponse } from "next/server"
import { getCryptoPricesServer } from "@/lib/services/market-data"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  const result = await getCryptoPricesServer(ids)
  return NextResponse.json(result)
}
