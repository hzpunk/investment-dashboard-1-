"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"
import { formatLocaleDate } from "@/lib/i18n-display"

interface PerformanceChartProps {
  className?: string
  data: { date: string; value: number }[]
  period: "1M" | "3M" | "6M" | "1Y" | "ALL"
}

export function PerformanceChart({ className, data, period }: PerformanceChartProps) {
  const { t } = useI18n()
  // Ensure setActiveTab handles the correct union type
  const [activeTab, setActiveTab] = useState<PerformanceChartProps['period']>(period)

  if (!data || data.length < 2) {
    return (
      <div className={cn("flex h-[300px] items-center justify-center text-muted-foreground", className)}>
        {t("performance.noData")}
      </div>
    )
  }

  const calculateMetrics = (chartData: { date: string; value: number }[]) => {
    if (!chartData || chartData.length < 2) return { startValue: 0, endValue: 0, returnPercent: 0 }

    const startValue = chartData[0].value
    const endValue = chartData[chartData.length - 1].value
    const returnPercent = ((endValue - startValue) / startValue) * 100

    return {
      startValue,
      endValue,
      returnPercent,
    }
  }

  const metrics = calculateMetrics(data)

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{t("performance.title")}</CardTitle>
        <CardDescription>{t("performance.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as PerformanceChartProps['period'])} className="space-y-4">
          <TabsList>
            <TabsTrigger value="1M">1M</TabsTrigger>
            <TabsTrigger value="3M">3M</TabsTrigger>
            <TabsTrigger value="6M">6M</TabsTrigger>
            <TabsTrigger value="1Y">1Y</TabsTrigger>
            <TabsTrigger value="ALL">{t("common.all")}</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="space-y-4">
            <div className="h-[300px] w-full">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <linearGradient id={`gradient-${activeTab}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
                <path
                  d={`M0,${100 - data[0].value} ${data.map((point, i) => `L${(i / (data.length - 1)) * 100},${100 - point.value}`).join(" ")}`}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                />
                <path
                  d={`M0,${100 - data[0].value} ${data.map((point, i) => `L${(i / (data.length - 1)) * 100},${100 - point.value}`).join(" ")} L100,100 L0,100 Z`}
                  fill={`url(#gradient-${activeTab})`}
                />
              </svg>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {/* Convert date strings to Date objects */}
              <span>{formatLocaleDate(new Date(data[0].date), t("date_locale"))}</span>
              <span>{formatLocaleDate(new Date(data[Math.floor(data.length / 2)].date), t("date_locale"))}</span>
              <span>{formatLocaleDate(new Date(data[data.length - 1].date), t("date_locale"))}</span>
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
                  className={`text-lg font-bold ${metrics.returnPercent >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {metrics.returnPercent >= 0 ? "+" : ""}
                  {metrics.returnPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}