import { cacheKeys } from "@/lib/cache-keys"
import { requireRequestUser } from "@/lib/api-auth"
import { cached } from "@/lib/server-cache"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"
import { readAccountScopeFromSearchParams, resolveAccountScopeForUser, accountScopeCachePart } from "@/lib/accounts/account-scope.server"
import { buildAnalyticsDto } from "@/lib/services/analytics"

// GET /api/analytics - portfolio analytics and metrics
// Query params: from, to (ISO dates), portfolioId (optional)
export async function GET(request: Request) {
  try {
    const user = await requireRequestUser()
    const { searchParams } = new URL(request.url)
    
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const portfolioId = searchParams.get("portfolioId")
    const displayCurrency = searchParams.get("currency") ?? "RUB"
    const accountScopeInput = readAccountScopeFromSearchParams(searchParams)
    
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    const fromDate = fromParam ? new Date(fromParam) : defaultFrom
    const toDate = toParam ? new Date(toParam) : now
    
    // Validate dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return apiError(ApiErrorCode.VALIDATION_ERROR, 'Invalid date format', { status: 400 })
    }
    
    if (fromDate > toDate) {
      return apiError(ApiErrorCode.VALIDATION_ERROR, 'From date must be before to date', { status: 400 })
    }
    
    // Max range: 5 years
    const maxRange = 5 * 366 * 24 * 60 * 60 * 1000
    if (toDate.getTime() - fromDate.getTime() > maxRange) {
      return apiError(ApiErrorCode.VALIDATION_ERROR, 'Date range too large (max 5 years)', { status: 400 })
    }

    const accountScope = await resolveAccountScopeForUser(user.id, accountScopeInput.type === "single" ? accountScopeInput.accountId : "all")
    const rangeKey = `${fromDate.toISOString()}:${toDate.toISOString()}:${portfolioId ?? "all"}:${accountScopeCachePart(accountScope)}:${displayCurrency}`
    const analytics = await cached({
      key: cacheKeys.userAnalytics(user.id, rangeKey),
      ttlSeconds: 300,
      label: `analytics user=${user.id} scope=${accountScopeCachePart(accountScope)}`,
      fetcher: () => buildAnalyticsDto(user.id, { fromDate, toDate, portfolioId, accountScope, displayCurrency }),
    })

    return apiSuccess(analytics)
  } catch (error) {
    if ((error as { statusCode?: number })?.statusCode === 404) {
      return apiError(ApiErrorCode.ACCOUNT_NOT_FOUND, "Account not found", { status: 404 })
    }
    return apiError(ApiErrorCode.INTERNAL_ERROR, "Failed to calculate analytics", { status: 500 })
  }
}
