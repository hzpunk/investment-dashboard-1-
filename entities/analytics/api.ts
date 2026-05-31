import { createLogger } from "@/lib/logger"

const logger = createLogger("AnalyticsAPI")

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      logger.warn(`API request failed: ${url}`, data?.error)
      return null
    }
    return data as T
  } catch (error) {
    logger.error(`API request error: ${url}`, error)
    return null
  }
}

export async function getPortfolioPerformance(userId: string, period: string) {
  const now = new Date();
  let fromDate: Date;

  switch (period) {
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
    const data = await apiFetch<{ monthlyPerformance: any[] }>(`/api/analytics?from=${fromDate.toISOString()}&to=${now.toISOString()}`);
    return data?.monthlyPerformance || [];
  } catch (error) {
    logger.error("Error fetching portfolio performance:", error);
    return [];
  }
}

export async function getAssetAllocation(userId: string) {
  void userId
  try {
    const data = await apiFetch<{ allocation: Array<{ type: string; value: number }> }>("/api/portfolio/allocation")
    return data?.allocation || []
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

