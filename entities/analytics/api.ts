import { createLogger } from "@/lib/logger"
import { apiFetch } from "@/lib/api-client"
import { appendAccountScope, type AccountScope } from "@/lib/accounts/account-scope"
import type { AnalyticsDto } from "@/lib/finance"
import type { PerformancePeriod, PortfolioPerformancePoint } from "@/lib/finance"

const logger = createLogger("AnalyticsAPI")

export type { AnalyticsDto }

export async function fetchAnalytics(params: { from?: string; to?: string; portfolioId?: string; accountScope?: AccountScope; displayCurrency?: string } = {}) {
  const query = new URLSearchParams()
  if (params.from) query.set("from", params.from)
  if (params.to) query.set("to", params.to)
  if (params.portfolioId) query.set("portfolioId", params.portfolioId)
  if (params.displayCurrency) query.set("currency", params.displayCurrency)
  if (params.accountScope) appendAccountScope(query, params.accountScope)

  const suffix = query.toString() ? `?${query.toString()}` : ""
  return apiFetch<AnalyticsDto>(`/api/analytics${suffix}`)
}

export async function getPortfolioPerformance(userId: string, period: PerformancePeriod | string): Promise<PortfolioPerformancePoint[]> {
  void userId
  const now = new Date();
  let fromDate: Date;

  switch (period) {
    case "7D":
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case "1M":
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3M":
      fromDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "6M":
      fromDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case "1Y":
      fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "ALL":
      fromDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()); // Max 5 years as per API
      break;
    default:
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  try {
    const data = await fetchAnalytics({ from: fromDate.toISOString(), to: now.toISOString() });
    return data?.performance?.byPeriod?.[period as PerformancePeriod] || data?.performance?.points || [];
  } catch (error) {
    logger.error("Error fetching portfolio performance:", error);
    return [];
  }
}

export async function getAssetAllocation(userId: string) {
  void userId
  try {
    const data = await apiFetch<{ allocation: Array<{ type: string; value: number }>; byType?: Array<{ key: string; value: number }> }>("/api/portfolio/allocation")
    return data?.allocation || data?.byType?.map((item) => ({ type: item.key, value: item.value })) || []
  } catch (error) {
    logger.error("Error getting asset allocation:", error)
    return []
  }
}

export async function getTransactionStats(userId: string) {
  void userId
  try {
    const transactionsData = await apiFetch<any[]>("/api/data/transactions")
    if (!Array.isArray(transactionsData)) return []
    const typeCounts = transactionsData.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    return Object.entries(typeCounts).map(([type, count]) => ({ type, count }))
  } catch (error) {
    logger.error("Error getting transaction stats:", error)
    return []
  }
}

