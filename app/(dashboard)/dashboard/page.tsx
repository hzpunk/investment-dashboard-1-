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
import { triggerAssetPricesUpdate, Asset } from "@/entities/asset/api"
import { useI18n } from "@/contexts/i18n-context"
import { getHistoricalPrices } from "@/shared/api/market-data"

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
    performanceData: Record<string, { date: string; value: number }[]>
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
    performanceData: {},
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      setIsLoading(true)

      const safeFetch = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn()
        } catch (e) {
          console.warn("Fetch failed, using fallback:", e)
          return fallback
        }
      }

      try {
        await safeFetch(triggerAssetPricesUpdate, undefined)
        const accounts = await safeFetch(() => fetchAccounts(user.id), [])
        const transactions = await safeFetch(() => fetchRecentTransactions(user.id, 5), [])
        const goals = await safeFetch(() => fetchGoals(user.id), [])
        const totalValue = accounts?.reduce((sum, account) => sum + (account?.balance || 0), 0) || 0

        let portfolioAllocation: any[] = []
        let portfolioChange = 0
        let portfolioChangePercent = 0
        let ytdReturn = 0
        let allTimeReturn = 0

        try {
          const portfolios = await fetchPortfolios()
          if (portfolios && portfolios.length > 0) {
            const stats = await calculatePortfolioStats(portfolios[0].id)
            portfolioAllocation = stats?.allocation || []
            
            // For now, let's assume portfolioChange and returns are part of stats if we extend backend
            // Or, calculate here. For simplicity, let's just make them 0 if not available
            // If we need true portfolio performance, we would need a more complex calculation
            // involving historical data of all assets in the portfolio.
            // For the PerformanceChart, we'll fetch a default asset's historical data.
          }
        } catch (e) {
          console.warn("Portfolio fetch failed:", e)
        }

        // Fetch performance data for a default asset (e.g., BTC) for the PerformanceChart
        const performanceData: Record<string, { date: string; value: number }[]> = {}
        const timeframes = ["1M", "3M", "6M", "1Y", "ALL"] as const
        const defaultPerformanceAsset = "BTC"
        const defaultPerformanceAssetType = "crypto"

        for (const timeframe of timeframes) {
          performanceData[timeframe] = await safeFetch(
            () => getHistoricalPrices(defaultPerformanceAsset, defaultPerformanceAssetType, timeframe),
            []
          )
        }

        // Simple calculation for portfolioChange and percent based on totalValue and 1M historical data
        if (performanceData["1M"] && performanceData["1M"].length > 0) {
          const currentPrice = performanceData["1M"][performanceData["1M"].length - 1].value
          const oneMonthAgoPrice = performanceData["1M"][0].value
          if (oneMonthAgoPrice !== 0) {
            portfolioChange = currentPrice - oneMonthAgoPrice
            portfolioChangePercent = (portfolioChange / oneMonthAgoPrice) * 100
          }
        }

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
          performanceData,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
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
          performanceData: {},
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
