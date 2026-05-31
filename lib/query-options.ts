import { fetchAccounts } from "@/entities/account/api"
import { fetchAssets } from "@/entities/asset/api"
import { getAssetAllocation, getPortfolioPerformance, getTransactionStats } from "@/entities/analytics/api"
import { fetchGoals } from "@/entities/goal/api"
import { fetchPortfolioAllocation, fetchPortfolioWithAssets, fetchPortfolios } from "@/entities/portfolio/api"
import { fetchRecentTransactions, fetchTransactions } from "@/entities/transaction/api"
import { getHistoricalPrices } from "@/shared/api/market-data"

export const queryKeys = {
  accounts: (userId: string) => ["accounts", userId] as const,
  assets: () => ["assets"] as const,
  dashboardPerformance: (userId: string) => ["dashboard-performance", userId] as const,
  goals: (userId: string) => ["goals", userId] as const,
  portfolio: (userId: string, portfolioId: string) => ["portfolio", userId, portfolioId] as const,
  portfolioAllocation: (userId: string) => ["portfolio-allocation", userId] as const,
  portfolios: (userId: string) => ["portfolios", userId] as const,
  recentTransactions: (userId: string, limit: number) => ["transactions", userId, "recent", limit] as const,
  transactions: (userId: string) => ["transactions", userId, "all"] as const,
  analytics: (userId: string) => ["analytics", userId] as const,
}

const minute = 60 * 1000

export const privateDataCache = {
  staleTime: 2 * minute,
  gcTime: 30 * minute,
  refetchOnWindowFocus: false,
}

export const referenceDataCache = {
  staleTime: 5 * minute,
  gcTime: 30 * minute,
  refetchOnWindowFocus: false,
}

export const marketDataCache = {
  staleTime: 15 * minute,
  gcTime: 45 * minute,
  refetchOnWindowFocus: false,
}

export function accountsQuery(userId: string) {
  return {
    queryKey: queryKeys.accounts(userId),
    queryFn: () => fetchAccounts(userId),
    ...privateDataCache,
  }
}

export function assetsQuery() {
  return {
    queryKey: queryKeys.assets(),
    queryFn: fetchAssets,
    ...referenceDataCache,
  }
}

export function goalsQuery(userId: string) {
  return {
    queryKey: queryKeys.goals(userId),
    queryFn: () => fetchGoals(userId),
    ...privateDataCache,
  }
}

export function recentTransactionsQuery(userId: string, limit = 5) {
  return {
    queryKey: queryKeys.recentTransactions(userId, limit),
    queryFn: () => fetchRecentTransactions(userId, limit),
    ...privateDataCache,
  }
}

export function transactionsQuery(userId: string) {
  return {
    queryKey: queryKeys.transactions(userId),
    queryFn: () => fetchTransactions(userId),
    ...privateDataCache,
  }
}

export function portfoliosQuery(userId: string) {
  return {
    queryKey: queryKeys.portfolios(userId),
    queryFn: fetchPortfolios,
    ...privateDataCache,
  }
}

export function portfolioQuery(userId: string, portfolioId: string) {
  return {
    queryKey: queryKeys.portfolio(userId, portfolioId),
    queryFn: () => fetchPortfolioWithAssets(portfolioId),
    ...privateDataCache,
  }
}

export function portfolioAllocationQuery(userId: string) {
  return {
    queryKey: queryKeys.portfolioAllocation(userId),
    queryFn: fetchPortfolioAllocation,
    ...privateDataCache,
  }
}

export function dashboardPerformanceQuery(userId: string) {
  return {
    queryKey: queryKeys.dashboardPerformance(userId),
    queryFn: async () => {
      const timeframes = ["1M", "3M", "6M", "1Y", "ALL"] as const
      const entries = await Promise.all(
        timeframes.map(async (timeframe) => [
          timeframe,
          await getHistoricalPrices("BTC", "crypto", timeframe),
        ] as const),
      )
      return Object.fromEntries(entries) as Record<string, { date: string; value: number }[]>
    },
    ...marketDataCache,
  }
}

export function analyticsQuery(userId: string) {
  return {
    queryKey: queryKeys.analytics(userId),
    queryFn: async () => {
      const timeframes = ["1M", "3M", "6M", "1Y", "ALL"] as const
      const [performanceEntries, allocationData, transactionStats] = await Promise.all([
        Promise.all(
          timeframes.map(async (timeframe) => [
            timeframe,
            await getPortfolioPerformance(userId, timeframe),
          ] as const),
        ),
        getAssetAllocation(userId),
        getTransactionStats(userId),
      ])

      return {
        performanceData: Object.fromEntries(performanceEntries),
        allocationData,
        transactionStats,
      }
    },
    ...privateDataCache,
  }
}
