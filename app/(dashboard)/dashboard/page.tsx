"use client"

import { useEffect, useState } from "react"
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
import { fetchAccounts } from "@/entities/account/api"
import { fetchRecentTransactions } from "@/entities/transaction/api"
import { fetchGoals } from "@/entities/goal/api"
import { fetchPortfolios, calculatePortfolioStats } from "@/entities/portfolio/api"
import { updateAssetPrices } from "@/entities/asset/api"
import { useI18n } from "@/contexts/i18n-context"

export default function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<{
    totalValue: number
    accounts: any[]
    portfolioAllocation: any[]
    recentTransactions: any[]
    goals: any[]
    portfolioChange: number
    portfolioChangePercent: number
    ytdReturn: number
    allTimeReturn: number
  }>({
    totalValue: 0,
    accounts: [],
    portfolioAllocation: [],
    recentTransactions: [],
    goals: [],
    portfolioChange: 0,
    portfolioChangePercent: 0,
    ytdReturn: 0,
    allTimeReturn: 0,
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      setIsLoading(true)

      // Fetch all data with individual error handling
      const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn()
        } catch (e) {
          console.warn("Fetch failed, using fallback:", e)
          return fallback
        }
      }

      try {
        // Update asset prices (non-critical)
        await safeFetch(() => updateAssetPrices(), undefined)

        // Fetch accounts with fallback
        const accounts = await safeFetch(() => fetchAccounts(user.id), [])

        // Fetch recent transactions with fallback
        const transactions = await safeFetch(() => fetchRecentTransactions(user.id, 5), [])

        // Fetch goals with fallback  
        const goals = await safeFetch(() => fetchGoals(user.id), [])

        // Calculate total value from accounts
        const totalValue = accounts?.reduce((sum, account) => sum + (account?.balance || 0), 0) || 0

        // Get portfolio allocation with fallback
        let portfolioAllocation: any[] = []
        try {
          const portfolios = await fetchPortfolios(user.id)
          if (portfolios && portfolios.length > 0) {
            const stats = await calculatePortfolioStats(portfolios[0].id)
            portfolioAllocation = stats?.allocation || []
          }
        } catch (e) {
          console.warn("Portfolio fetch failed:", e)
        }

        // Placeholder values for portfolio performance
        const portfolioChange = 1243.45
        const portfolioChangePercent = 1.2
        const ytdReturn = 8.2
        const allTimeReturn = 12.5

        setDashboardData({
          totalValue,
          accounts: accounts || [],
          portfolioAllocation: portfolioAllocation || [],
          recentTransactions: transactions || [],
          goals: goals || [],
          portfolioChange,
          portfolioChangePercent,
          ytdReturn,
          allTimeReturn,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        // Keep default empty state on error
        setDashboardData({
          totalValue: 0,
          accounts: [],
          portfolioAllocation: [],
          recentTransactions: [],
          goals: [],
          portfolioChange: 0,
          portfolioChangePercent: 0,
          ytdReturn: 0,
          allTimeReturn: 0,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
      <DashboardHeader heading={t("dashboard.title")} text={t("dashboard.welcome")} />
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
          <PortfolioAllocation data={dashboardData.portfolioAllocation} className="col-span-1 md:col-span-2" />
        </SafeWidget>
        <SafeWidget title={t("dashboard.performanceChart")}>
          <PerformanceChart className="col-span-1" />
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

