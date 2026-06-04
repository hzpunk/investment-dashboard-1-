import { requireRequestUser } from "@/lib/api-auth"
import { getPortfolioSummary } from "@/lib/services/portfolio-summary"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET() {
  try {
    const user = await requireRequestUser()
    const summary = await getPortfolioSummary(user.id)

    return apiSuccess({
      allocation: summary.allocation,
      holdings: summary.holdings,
      totalValue: summary.totalValue,
      source: summary.source,
    })
  } catch (error: any) {
    return apiError(
      error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR,
      error?.status === 401 ? "Authentication required" : "Failed to calculate portfolio allocation",
      { status: error?.status ?? 500 },
    )
  }
}
