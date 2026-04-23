"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPortfolioPerformance, getAssetAllocation, getTransactionStats } from "@/entities/analytics/api"
import { BarChart, PieChart } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel, getTransactionTypeLabel } from "@/lib/i18n-display"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<any>({})
  const [allocationData, setAllocationData] = useState<any[]>([])
  const [transactionStats, setTransactionStats] = useState<any[]>([])

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return

      setIsLoading(true)

      try {
        // Fetch portfolio performance data
        const performance = {
          "1M": await getPortfolioPerformance(user.id, "1M"),
          "3M": await getPortfolioPerformance(user.id, "3M"),
          "6M": await getPortfolioPerformance(user.id, "6M"),
          "1Y": await getPortfolioPerformance(user.id, "1Y"),
          All: await getPortfolioPerformance(user.id, "All"),
        }
        setPerformanceData(performance)

        // Fetch asset allocation data
        const allocation = await getAssetAllocation(user.id)
        setAllocationData(allocation)

        // Fetch transaction statistics
        const transactions = await getTransactionStats(user.id)
        setTransactionStats(transactions)
      } catch (error) {
        console.error("Error fetching analytics data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [user])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // Map asset types to colors
  const typeColors: Record<string, string> = {
    stock: "bg-blue-500",
    bond: "bg-green-500",
    etf: "bg-yellow-500",
    crypto: "bg-purple-500",
    commodity: "bg-red-500",
    other: "bg-gray-500",
  }

  // Calculate total allocation value
  const totalAllocationValue = allocationData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("analytics.title")} text={t("analytics.description")} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("analytics.portfolioPerformance")}</CardTitle>
            <CardDescription>{t("analytics.portfolioPerformanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="1M" className="space-y-4">
              <TabsList>
                <TabsTrigger value="1M">1M</TabsTrigger>
                <TabsTrigger value="3M">3M</TabsTrigger>
                <TabsTrigger value="6M">6M</TabsTrigger>
                <TabsTrigger value="1Y">1Y</TabsTrigger>
                <TabsTrigger value="All">{t("common.all")}</TabsTrigger>
              </TabsList>
              {Object.entries(performanceData).map(([period, data]) => (
                <TabsContent key={period} value={period} className="space-y-4">
                  <div className="h-[300px] w-full">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <linearGradient id={`gradient-${period}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                      <path
                        d={`M0,${100 - data[0].value} ${data.map((point: any, i: number) => `L${(i / (data.length - 1)) * 100},${100 - point.value}`).join(" ")}`}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1.5"
                      />
                      <path
                        d={`M0,${100 - data[0].value} ${data.map((point: any, i: number) => `L${(i / (data.length - 1)) * 100},${100 - point.value}`).join(" ")} L100,100 L0,100 Z`}
                        fill={`url(#gradient-${period})`}
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{data[0].date}</span>
                    <span>{data[Math.floor(data.length / 2)].date}</span>
                    <span>{data[data.length - 1].date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("performance.startingValue")}</p>
                      <p className="text-lg font-bold">
                        ${(100000 - (data[data.length - 1].value - data[0].value) * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("performance.currentValue")}</p>
                      <p className="text-lg font-bold">${(100000).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("performance.return")}</p>
                      <p className="text-lg font-bold text-green-500">
                        +{(((data[data.length - 1].value - data[0].value) * 100) / data[0].value).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("analytics.assetAllocation")}</CardTitle>
              <CardDescription>{t("analytics.assetAllocationDescription")}</CardDescription>
            </div>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full relative">
              {/* Simplified donut chart */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-32 w-32 rounded-full border-8 border-transparent bg-background flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t("common.total")}</p>
                    <p className="text-lg font-bold">${totalAllocationValue.toLocaleString()}</p>
                  </div>
                </div>
                {allocationData.map((item, index) => (
                  <div
                    key={item.type}
                    className={`absolute inset-0 rounded-full ${typeColors[item.type] || "bg-gray-500"}`}
                    style={{
                      clipPath: `polygon(50% 50%, ${50 + 45 * Math.cos((index * 2 * Math.PI) / allocationData.length - Math.PI / 2)}% ${50 + 45 * Math.sin((index * 2 * Math.PI) / allocationData.length - Math.PI / 2)}%, ${50 + 45 * Math.cos(((index + 1) * 2 * Math.PI) / allocationData.length - Math.PI / 2)}% ${50 + 45 * Math.sin(((index + 1) * 2 * Math.PI) / allocationData.length - Math.PI / 2)}%)`,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {allocationData.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-2 ${typeColors[item.type] || "bg-gray-500"}`} />
                    <span className="text-sm">{getAssetTypeLabel(item.type, t)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {totalAllocationValue > 0 ? Math.round((item.value / totalAllocationValue) * 100) : 0}%
                    </span>
                    <span className="text-xs text-muted-foreground">${item.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("analytics.transactionAnalysis")}</CardTitle>
              <CardDescription>{t("analytics.transactionAnalysisDescription")}</CardDescription>
            </div>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-end justify-around">
              {transactionStats.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {t("analytics.noTransactionData")}
                </div>
              ) : (
                transactionStats.map((stat) => {
                  const height = `${(stat.count / Math.max(...transactionStats.map((s: any) => s.count))) * 100}%`
                  return (
                    <div key={stat.type} className="flex flex-col items-center">
                      <div className="w-16 bg-primary/80 rounded-t-md flex items-end justify-center" style={{ height }}>
                        <span className="text-xs font-medium text-primary-foreground p-1">{stat.count}</span>
                      </div>
                      <span className="mt-2 text-xs">{getTransactionTypeLabel(stat.type, t)}</span>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

