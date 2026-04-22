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
import { fetchAccounts } from "@/entities/account/api"
import { fetchRecentTransactions } from "@/entities/transaction/api"
import { fetchGoals } from "@/entities/goal/api"
import { fetchPortfolios, calculatePortfolioStats } from "@/entities/portfolio/api"
import { updateAssetPrices } from "@/entities/asset/api"

export default function DashboardPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
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

      try {
        // Update asset prices from external APIs
        await updateAssetPrices()

        // Fetch accounts
        const accounts = await fetchAccounts(user.id)

        // Fetch recent transactions
        const transactions = await fetchRecentTransactions(user.id, 5)

        // Fetch goals
        const goals = await fetchGoals(user.id)

        // Calculate total value from accounts
        const totalValue = accounts?.reduce((sum, account) => sum + account.balance, 0) || 0

        // Get portfolio allocation
        const portfolios = await fetchPortfolios(user.id)
        let portfolioAllocation = []

        if (portfolios && portfolios.length > 0) {
          const stats = await calculatePortfolioStats(portfolios[0].id)
          portfolioAllocation = stats.allocation
        }

        // For now, we'll use placeholder values for portfolio performance
        // In a real app, you would calculate these based on historical data
        const portfolioChange = 1243.45
        const portfolioChangePercent = 1.2
        const ytdReturn = 8.2
        const allTimeReturn = 12.5

        setDashboardData({
          totalValue,
          accounts: accounts || [],
          portfolioAllocation,
          recentTransactions: transactions || [],
          goals: goals || [],
          portfolioChange,
          portfolioChangePercent,
          ytdReturn,
          allTimeReturn,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
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
      <DashboardHeader heading="Dashboard" text="Welcome to your investment dashboard." />
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <PortfolioOverview
          className="col-span-1 md:col-span-2"
          totalValue={dashboardData.totalValue}
          portfolioChange={dashboardData.portfolioChange}
          portfolioChangePercent={dashboardData.portfolioChangePercent}
          ytdReturn={dashboardData.ytdReturn}
          allTimeReturn={dashboardData.allTimeReturn}
        />
        <CryptoTicker />
        <PortfolioAllocation data={dashboardData.portfolioAllocation} className="col-span-1 md:col-span-2" />
        <PerformanceChart className="col-span-1" />
        <AccountsList accounts={dashboardData.accounts} className="col-span-1 md:col-span-3" />
        <RecentTransactions transactions={dashboardData.recentTransactions} className="col-span-1 md:col-span-2" />
        <GoalsList goals={dashboardData.goals} className="col-span-1" />
      </div>
    </div>
  )
}

