import { requireRequestUser } from "@/lib/api-auth"
import { getPortfolioSummary } from "@/lib/services/portfolio-summary"
import { readAccountScopeFromSearchParams, resolveAccountScopeForUser } from "@/lib/accounts/account-scope.server"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET(request: Request) {
  try {
    const user = await requireRequestUser()
    const { searchParams } = new URL(request.url)
    const accountScopeInput = readAccountScopeFromSearchParams(searchParams)
    const accountScope = await resolveAccountScopeForUser(user.id, accountScopeInput.type === "single" ? accountScopeInput.accountId : "all")
    const summary = await getPortfolioSummary(user.id, accountScope)

    return apiSuccess({
      allocation: summary.allocation,
      holdings: summary.holdings,
      totalValue: summary.totalValue,
      source: summary.source,
    })
  } catch (error: any) {
    return apiError(
      error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : error?.statusCode === 404 ? ApiErrorCode.ACCOUNT_NOT_FOUND : ApiErrorCode.INTERNAL_ERROR,
      error?.status === 401 ? "Authentication required" : error?.statusCode === 404 ? "Account not found" : "Failed to calculate portfolio allocation",
      { status: error?.status ?? error?.statusCode ?? 500 },
    )
  }
}
