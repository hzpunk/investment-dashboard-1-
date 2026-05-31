import { NextResponse } from "next/server"
import { requireRequestUser } from "@/lib/api-auth"
import { getPortfolioSummary } from "@/lib/services/portfolio-summary"

export async function GET() {
  try {
    const user = await requireRequestUser()
    const summary = await getPortfolioSummary(user.id)

    return NextResponse.json({
      allocation: summary.allocation,
      holdings: summary.holdings,
      totalValue: summary.totalValue,
      source: summary.source,
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to calculate portfolio allocation" }, { status: error?.status ?? 500 })
  }
}
