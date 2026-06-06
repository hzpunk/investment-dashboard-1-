import { fetchAccounts } from "@/entities/account/api"
import { fetchAssets } from "@/entities/asset/api"
import { fetchAnalytics } from "@/entities/analytics/api"
import { fetchGoals } from "@/entities/goal/api"
import { fetchPortfolioAllocation, fetchPortfolioWithAssets, fetchPortfolios } from "@/entities/portfolio/api"
import { fetchRecentTransactions, fetchTransactions } from "@/entities/transaction/api"
import { accountScopeKey, type AccountScope } from "@/lib/accounts/account-scope"

export const queryKeys = {
  accounts: (userId: string) => ["accounts", userId] as const,
  assets: () => ["assets"] as const,
  dashboardPerformance: (userId: string) => ["dashboard-performance", userId] as const,
  goals: (userId: string) => ["goals", userId] as const,
  portfolio: (userId: string, portfolioId: string) => ["portfolio", userId, portfolioId] as const,
  portfolioAllocation: (userId: string, scope?: AccountScope) => ["portfolio-allocation", userId, scope ? accountScopeKey(scope) : "all"] as const,
  portfolios: (userId: string) => ["portfolios", userId] as const,
  recentTransactions: (userId: string, limit: number, scope?: AccountScope) => ["transactions", userId, "recent", limit, scope ? accountScopeKey(scope) : "all"] as const,
  transactions: (userId: string, scope?: AccountScope) => ["transactions", userId, "all", scope ? accountScopeKey(scope) : "all"] as const,
  analytics: (userId: string, scope?: AccountScope, displayCurrency?: string) => ["analytics", userId, scope ? accountScopeKey(scope) : "all", displayCurrency ?? "RUB"] as const,
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

export function recentTransactionsQuery(userId: string, limit = 5, scope?: AccountScope) {
  return {
    queryKey: queryKeys.recentTransactions(userId, limit, scope),
    queryFn: () => fetchRecentTransactions(userId, limit, scope),
    ...privateDataCache,
  }
}

export function transactionsQuery(userId: string, scope?: AccountScope) {
  return {
    queryKey: queryKeys.transactions(userId, scope),
    queryFn: () => fetchTransactions(userId, scope),
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

export function portfolioAllocationQuery(userId: string, scope?: AccountScope) {
  return {
    queryKey: queryKeys.portfolioAllocation(userId, scope),
    queryFn: () => fetchPortfolioAllocation(scope),
    ...privateDataCache,
  }
}

export function dashboardPerformanceQuery(userId: string) {
  return {
    queryKey: queryKeys.dashboardPerformance(userId),
    queryFn: async () => {
      const analytics = await fetchAnalytics()
      return analytics.performance.byPeriod
    },
    ...privateDataCache,
  }
}

export function analyticsQuery(userId: string, scope?: AccountScope, displayCurrency?: string) {
  return {
    queryKey: queryKeys.analytics(userId, scope, displayCurrency),
    queryFn: () => fetchAnalytics({ accountScope: scope, displayCurrency }),
    ...privateDataCache,
  }
}
