"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getHistoricalPrices, cryptoIdMap } from "@/shared/api/market-data"

interface PerformanceChartProps {
  className?: string
  symbol?: string
  type?: "stock" | "crypto"
  initialValue?: number
}

export function PerformanceChart({
  className,
  symbol = "BTC",
  type = "crypto",
  initialValue = 100000,
}: PerformanceChartProps) {
  const [performanceData, setPerformanceData] = useState<Record<string, any[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const timeframes = ["1M", "3M", "6M", "1Y", "ALL"] as const
        const results: Record<string, any[]> = {}

        // Determine the actual symbol to use
        const actualSymbol = type === "crypto" ? cryptoIdMap[symbol] || "bitcoin" : symbol

        // Fetch data for each timeframe
        for (const timeframe of timeframes) {
          const data = await getHistoricalPrices(actualSymbol, type, timeframe)
          results[timeframe] = data
        }

        setPerformanceData(results)
      } catch (err) {
        console.error("Error fetching performance data:", err)
        setError("Failed to load performance data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [symbol, type])

  // Calculate returns and other metrics
  const calculateMetrics = (data: any[]) => {
    if (!data || data.length < 2) return { startValue: 0, endValue: 0, returnPercent: 0 }

    const startValue = data[0].value
    const endValue = data[data.length - 1].value
    const returnPercent = ((endValue - startValue) / startValue) * 100

    return {
      startValue: (initialValue / endValue) * startValue,
      endValue: initialValue,
      returnPercent,
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Performance</CardTitle>
        <CardDescription>Track your portfolio performance over time</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-[200px] w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : (
          <Tabs defaultValue="1M" className="space-y-4">
            <TabsList>
              <TabsTrigger value="1M">1M</TabsTrigger>
              <TabsTrigger value="3M">3M</TabsTrigger>
              <TabsTrigger value="6M">6M</TabsTrigger>
              <TabsTrigger value="1Y">1Y</TabsTrigger>
              <TabsTrigger value="ALL">All</TabsTrigger>
            </TabsList>
            {Object.entries(performanceData).map(([period, data]) => {
              if (!data || data.length < 2) return null

              const metrics = calculateMetrics(data)
              const minValue = Math.min(...data.map((d) => d.value))
              const maxValue = Math.max(...data.map((d) => d.value))
              const valueRange = maxValue - minValue

              return (
                <TabsContent key={period} value={period} className="space-y-4">
                  <div className="h-[200px] w-full">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <linearGradient id={`gradient-${period}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                      <path
                        d={`M0,${100 - ((data[0].value - minValue) / valueRange) * 80} ${data.map((point, i) => `L${(i / (data.length - 1)) * 100},${100 - ((point.value - minValue) / valueRange) * 80}`).join(" ")}`}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1.5"
                      />
                      <path
                        d={`M0,${100 - ((data[0].value - minValue) / valueRange) * 80} ${data.map((point, i) => `L${(i / (data.length - 1)) * 100},${100 - ((point.value - minValue) / valueRange) * 80}`).join(" ")} L100,100 L0,100 Z`}
                        fill={`url(#gradient-${period})`}
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(data[0].date).toLocaleDateString()}</span>
                    <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString()}</span>
                    <span>{new Date(data[data.length - 1].date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Starting Value</p>
                      <p className="text-lg font-bold">
                        ${metrics.startValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Value</p>
                      <p className="text-lg font-bold">${metrics.endValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Return</p>
                      <p
                        className={`text-lg font-bold ${metrics.returnPercent >= 0 ? "text-green-500" : "text-red-500"}`}
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
        )}
      </CardContent>
    </Card>
  )
}

