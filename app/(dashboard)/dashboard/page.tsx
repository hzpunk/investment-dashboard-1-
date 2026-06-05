"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { PortfolioOverview } from "@/components/portfolio-overview"
import { PortfolioAllocation } from "@/components/portfolio-allocation"
import { RecentTransactions } from "@/components/recent-transactions"
import { PerformanceChart } from "@/components/performance-chart"
import { AccountsList } from "@/components/accounts-list"
import { GoalsList } from "@/components/goals-list"
import { CryptoTicker } from "@/widgets/crypto-ticker/ui/crypto-ticker"
import { SafeWidget } from "@/components/error-boundary"
import { AIAssistant } from "@/components/ai-assistant"
import { useI18n } from "@/contexts/i18n-context"
import {
  accountsQuery,
  analyticsQuery,
  goalsQuery,
  recentTransactionsQuery,
} from "@/lib/query-options"
import { RefreshCw } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const userId = user?.id ?? ""
  const enabled = Boolean(user)

  const accountsResult = useQuery({ ...accountsQuery(userId), enabled })
  const recentTransactionsResult = useQuery({ ...recentTransactionsQuery(userId, 5), enabled })
  const goalsResult = useQuery({ ...goalsQuery(userId), enabled })
  const analyticsResult = useQuery({ ...analyticsQuery(userId), enabled })

  const dashboardData = useMemo(() => {
    const accounts = accountsResult.data ?? []
    const analytics = analyticsResult.data
    const performanceData = analytics?.performance.byPeriod
    const oneMonthData = performanceData?.["1M"] ?? []
    const accountValue = accounts.reduce((sum, account) => sum + (account?.balance || 0), 0)
    const totalValue = analytics?.summary.totalPortfolioValue ?? accountValue
    let portfolioChange = 0
    let portfolioChangePercent = 0

    if (oneMonthData.length > 1) {
      const currentValue = oneMonthData[oneMonthData.length - 1].portfolioValue
      const oneMonthAgoValue = oneMonthData[0].portfolioValue
      if (oneMonthAgoValue !== 0) {
        portfolioChange = currentValue - oneMonthAgoValue
        portfolioChangePercent = (portfolioChange / oneMonthAgoValue) * 100
      }
    }

    return {
      totalValue,
      accounts,
      portfolioAllocation: analytics?.allocation.byType || [],
      recentTransactions: recentTransactionsResult.data ?? [],
      goals: goalsResult.data ?? [],
      portfolioChange,
      portfolioChangePercent,
      ytdReturn: analytics?.performance.metrics.annualizedReturnPercent ?? 0,
      allTimeReturn: analytics?.summary.pnlPercent ?? 0,
      performanceData: performanceData ?? {},
      analytics,
    }
  }, [
    accountsResult.data,
    analyticsResult.data,
    goalsResult.data,
    recentTransactionsResult.data,
  ])

  const isLoading =
    (accountsResult.isLoading && !accountsResult.data) ||
    (recentTransactionsResult.isLoading && !recentTransactionsResult.data) ||
    (goalsResult.isLoading && !goalsResult.data) ||
    (analyticsResult.isLoading && !analyticsResult.data)
  const isRefreshing =
    !isLoading &&
    (accountsResult.isFetching ||
      recentTransactionsResult.isFetching ||
      goalsResult.isFetching ||
      analyticsResult.isFetching)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
      <DashboardHeader heading={t("dashboard.title")} text={t("dashboard.welcome")}>
        {isRefreshing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : null}
      </DashboardHeader>
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <SafeWidget title={t("dashboard.portfolioOverview")}>
          <PortfolioOverview
            className="col-span-1 md:col-span-2"
            totalValue={dashboardData.totalValue}
            portfolioChange={dashboardData.portfolioChange}
            portfolioChangePercent={dashboardData.portfolioChangePercent}
            ytdReturn={dashboardData.ytdReturn}
            allTimeReturn={dashboardData.allTimeReturn}
          />
        </SafeWidget>
        <SafeWidget title={t("dashboard.cryptoTicker")}>
          <CryptoTicker />
        </SafeWidget>
        <SafeWidget title={t("dashboard.portfolioAllocation")}>
          <PortfolioAllocation
            data={dashboardData.portfolioAllocation}
            totalValue={dashboardData.analytics?.allocation.totalValue}
            assetCount={dashboardData.analytics?.summary.assetCount}
            largestPosition={dashboardData.analytics?.summary.largestPosition}
            diversificationScore={dashboardData.analytics?.summary.diversificationScore}
            className="col-span-1 md:col-span-2"
          />
        </SafeWidget>
        <SafeWidget title={t("dashboard.performanceChart")}>
          <PerformanceChart className="col-span-1" data={dashboardData.performanceData} />
        </SafeWidget>
        <SafeWidget title={t("dashboard.accounts")}>
          <AccountsList accounts={dashboardData.accounts} className="col-span-1 md:col-span-3" />
        </SafeWidget>
        <SafeWidget title={t("dashboard.recentTransactions")}>
          <RecentTransactions transactions={dashboardData.recentTransactions} className="col-span-1 md:col-span-2" />
        </SafeWidget>
        <SafeWidget title={t("dashboard.goals")}>
          <GoalsList goals={dashboardData.goals} className="col-span-1" />
        </SafeWidget>
      </div>
      <AIAssistant />
    </div>
  )
}
