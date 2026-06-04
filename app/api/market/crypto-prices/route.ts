import { getCryptoPricesServer } from "@/lib/services/market-data"
import { apiSuccess } from "@/lib/api-response"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  const result = await getCryptoPricesServer(ids)
  return apiSuccess(result)
}
