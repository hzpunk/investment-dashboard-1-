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
import { cn } from "@/lib/utils"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<any>({})
  const [allocationData, setAllocationData] = useState<any[]>([])
  const [transactionStats, setTransactionStats] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user) return

      setIsLoading(true)
      setError(null)

      try {
        // Fetch portfolio performance data
        const performance = {
          "1M": await getPortfolioPerformance(user.id, "1M"),
          "3M": await getPortfolioPerformance(user.id, "3M"),
          "6M": await getPortfolioPerformance(user.id, "6M"),
          "1Y": await getPortfolioPerformance(user.id, "1Y"),
          ALL: await getPortfolioPerformance(user.id, "ALL"),
        }
        setPerformanceData(performance)

        // Fetch asset allocation data
        const allocation = await getAssetAllocation(user.id)
        setAllocationData(allocation)

        // Fetch transaction statistics
        const transactions = await getTransactionStats(user.id)
        setTransactionStats(transactions)
      } catch (err) {
        console.error("Error fetching analytics data:", err)
        setError(t("errors.loadFailed"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [user, t])

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

  const calculateMetrics = (data: any[]) => {
    if (!data || data.length < 2) return { startValue: 0, endValue: 0, returnPercent: 0 }

    const startValue = data[0].value
    const endValue = data[data.length - 1].value
    const returnPercent = ((endValue - startValue) / startValue) * 100

    return {
      startValue,
      endValue,
      returnPercent,
    }
  }

  const timeframes = ["1M", "3M", "6M", "1Y", "ALL"] as const

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
                {timeframes.map((timeframe) => (
                  <TabsTrigger key={timeframe} value={timeframe}>{timeframe}</TabsTrigger>
                ))}
              </TabsList>
              {error ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">{error}</p>
                </div>
              ) : (
                timeframes.map((period) => {
                  const dataArray = performanceData[period] as any[]
                  if (!dataArray || dataArray.length < 2) {
                    return (
                      <TabsContent key={period} value={period} className="space-y-4">
                        <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                          {t("analytics.noPerformanceData")}
                        </div>
                      </TabsContent>
                    )
                  }

                  const metrics = calculateMetrics(dataArray)

                  return (
                    <TabsContent key={period} value={period} className="space-y-4">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dataArray}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value: string) => new Date(value).toLocaleDateString(t("date_locale"), { month: "short", day: "numeric" })}
                            />
                            <YAxis
                              stroke="#888888"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                            />
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <Tooltip
                              formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Value"]}
                              labelFormatter={(label: string) => new Date(label).toLocaleDateString(t("date_locale"), { year: "numeric", month: "short", day: "numeric" })}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="var(--primary)"
                              fillOpacity={1}
                              fill="url(#colorValue)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{t("performance.startingValue")}</p>
                          <p className="text-lg font-bold">
                            ${metrics.startValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t("performance.currentValue")}</p>
                          <p className="text-lg font-bold">
                            ${metrics.endValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t("performance.return")}</p>
                          <p
                            className={cn(
                              "text-lg font-bold",
                              metrics.returnPercent >= 0 ? "text-green-500" : "text-red-500"
                            )}
                          >
                            {metrics.returnPercent >= 0 ? "+" : ""}
                            {metrics.returnPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
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
                    <p className="text-lg font-bold">
                      ${totalAllocationValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* This is a simplified representation. For actual donut chart, you'd use a charting library or more complex SVG/CSS. */}
                {/* Example of how slices would be rendered - this part is likely placeholder or requires more advanced logic */}
                {allocationData.map((item, index) => (
                  <div
                    key={item.type}
                    className={`absolute inset-0 rounded-full ${typeColors[item.type] || "bg-gray-500"}`}
                    style={{
                      // This clipPath is a basic example and might need adjustment for actual donut slices
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