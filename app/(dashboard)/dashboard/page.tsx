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
import { CbrRatesWidget } from "@/components/cbr-rates-widget"
import { SafeWidget } from "@/components/error-boundary"
import { AIAssistant } from "@/components/ai-assistant"
import { AccountSwitcher } from "@/components/account-switcher"
import { CurrencyConversionWarning } from "@/components/currency-conversion-warning"
import { useI18n } from "@/contexts/i18n-context"
import { useSelectedAccount } from "@/hooks/use-selected-account"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
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
  const { scope, selectedAccount } = useSelectedAccount()
  const { displayCurrency } = useDisplayCurrency()
  const userId = user?.id ?? ""
  const enabled = Boolean(user)

  const accountsResult = useQuery({ ...accountsQuery(userId), enabled })
  const recentTransactionsResult = useQuery({ ...recentTransactionsQuery(userId, 5, scope), enabled })
  const goalsResult = useQuery({ ...goalsQuery(userId), enabled })
  const analyticsResult = useQuery({ ...analyticsQuery(userId, scope, displayCurrency), enabled })

  const dashboardData = useMemo(() => {
    const accounts = accountsResult.data ?? []
    const analytics = analyticsResult.data
    const performanceData = analytics?.performance.byPeriod
    const oneMonthData = performanceData?.["1M"] ?? []
    const scopedAccounts = scope.type === "single" ? accounts.filter((account) => account.id === scope.accountId) : accounts
    const totalValue = analytics?.summary.totalPortfolioValue ?? 0
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
      accounts: scopedAccounts,
      portfolioAllocation: analytics?.allocation.byType || [],
      recentTransactions: recentTransactionsResult.data ?? [],
      goals: goalsResult.data ?? [],
      portfolioChange,
      portfolioChangePercent,
      ytdReturn: analytics?.performance.metrics.annualizedReturnPercent ?? 0,
      allTimeReturn: analytics?.summary.pnlPercent ?? 0,
      performanceData: performanceData ?? {},
      analytics,
      displayCurrency: analytics?.currency.baseCurrency ?? displayCurrency,
    }
  }, [
    accountsResult.data,
    analyticsResult.data,
    goalsResult.data,
    recentTransactionsResult.data,
    scope,
    displayCurrency,
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
        <AccountSwitcher compact />
      </DashboardHeader>
      <div className="rounded-md border border-border/70 px-4 py-3 text-sm text-muted-foreground">
        {t("accounts.currentScope")}: <span className="font-medium text-foreground">{selectedAccount?.name ?? t("accounts.allAccounts")}</span>
        <span className="ml-3">{t("currency.displayCurrency")}: <span className="font-medium text-foreground">{dashboardData.displayCurrency}</span></span>
      </div>
      <CurrencyConversionWarning
        status={dashboardData.analytics?.currency.conversionStatus}
        stale={dashboardData.analytics?.currency.stale}
        warnings={dashboardData.analytics?.currency.warnings}
      />
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <SafeWidget title={t("dashboard.portfolioOverview")}>
          <PortfolioOverview
            className="col-span-1 md:col-span-2"
            totalValue={dashboardData.totalValue}
            portfolioChange={dashboardData.portfolioChange}
            portfolioChangePercent={dashboardData.portfolioChangePercent}
            ytdReturn={dashboardData.ytdReturn}
            allTimeReturn={dashboardData.allTimeReturn}
            currency={dashboardData.displayCurrency}
          />
        </SafeWidget>
        <SafeWidget title={t("dashboard.cryptoTicker")}>
          <CryptoTicker />
        </SafeWidget>
        <SafeWidget title={t("currency.rates.title")}>
          <CbrRatesWidget />
        </SafeWidget>
        <SafeWidget title={t("dashboard.portfolioAllocation")}>
          <PortfolioAllocation
            data={dashboardData.portfolioAllocation}
            totalValue={dashboardData.analytics?.allocation.totalValue}
            assetCount={dashboardData.analytics?.summary.assetCount}
            largestPosition={dashboardData.analytics?.summary.largestPosition}
            diversificationScore={dashboardData.analytics?.summary.diversificationScore}
            currency={dashboardData.displayCurrency}
            className="col-span-1 md:col-span-2"
          />
        </SafeWidget>
        <SafeWidget title={t("dashboard.performanceChart")}>
          <PerformanceChart className="col-span-1" data={dashboardData.performanceData} currency={dashboardData.displayCurrency} />
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
