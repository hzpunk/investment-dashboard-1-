"use client"

import { useMemo, useState } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { formatMoney as formatCurrencyMoney } from "@/lib/currency/formatting"
import type { PerformancePeriod, PortfolioPerformancePoint } from "@/lib/finance"

type LegacyPoint = { date: string; value: number }

interface PerformanceChartProps {
  className?: string
  data:
    | PortfolioPerformancePoint[]
    | LegacyPoint[]
    | Partial<Record<PerformancePeriod, PortfolioPerformancePoint[] | LegacyPoint[]>>
  period?: PerformancePeriod
  compact?: boolean
  currency?: string
}

const periods: PerformancePeriod[] = ["7D", "1M", "3M", "6M", "1Y", "ALL"]

function normalizePoint(point: PortfolioPerformancePoint | LegacyPoint): PortfolioPerformancePoint {
  const portfolioValue = Number("portfolioValue" in point ? point.portfolioValue : point.value)
  const investedAmount = Number("investedAmount" in point ? point.investedAmount : 0)
  const pnl = Number("pnl" in point ? point.pnl : portfolioValue - investedAmount)
  const pnlPercent = Number("pnlPercent" in point ? point.pnlPercent : investedAmount > 0 ? (pnl / investedAmount) * 100 : 0)

  return {
    date: point.date,
    portfolioValue: Number.isFinite(portfolioValue) ? portfolioValue : 0,
    investedAmount: Number.isFinite(investedAmount) ? investedAmount : 0,
    pnl: Number.isFinite(pnl) ? pnl : 0,
    pnlPercent: Number.isFinite(pnlPercent) ? pnlPercent : 0,
  }
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PerformanceChart({ className, data, period = "1M", compact = false, currency }: PerformanceChartProps) {
  const { locale, t } = useI18n()
  const { displayCurrency } = useDisplayCurrency()
  const chartCurrency = currency ?? displayCurrency
  const [activeTab, setActiveTab] = useState<PerformancePeriod>(period)
  const chartData = useMemo(() => {
    const rows = Array.isArray(data) ? data : data[activeTab] ?? []
    return rows
      .map((row) => normalizePoint(row as PortfolioPerformancePoint | LegacyPoint))
      .filter((row) => row.date && Number.isFinite(row.portfolioValue))
  }, [activeTab, data])

  const metrics = useMemo(() => {
    if (chartData.length < 2) return { startValue: 0, endValue: 0, returnPercent: 0, pnl: 0 }
    const startValue = chartData[0].portfolioValue
    const endValue = chartData[chartData.length - 1].portfolioValue
    const returnPercent = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : chartData[chartData.length - 1].pnlPercent
    return {
      startValue,
      endValue,
      returnPercent,
      pnl: chartData[chartData.length - 1].pnl,
    }
  }, [chartData])

  const emptyState = (
    <div className={cn("flex min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed px-6 py-8 text-center", className)}>
      <p className="text-sm font-medium text-foreground">{t("analytics.empty.performanceTitle")}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("analytics.empty.performanceDescription")}</p>
    </div>
  )

  if (compact && chartData.length < 2) return emptyState

  const chart = chartData.length < 2 ? (
    emptyState
  ) : (
    <div className="space-y-4">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f8cc9" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#4f8cc9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => formatDate(value, locale)}
              minTickGap={24}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value)
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                    <div className="font-medium">{formatDate(String(label), locale)}</div>
                    {payload.map((item) => (
                      <div key={item.dataKey} className="mt-1 flex min-w-48 items-center justify-between gap-4 text-muted-foreground">
                        <span>{item.name}</span>
                        <span className="font-medium text-foreground">{formatCurrencyMoney(Number(item.value), chartCurrency, locale)}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="portfolioValue"
              name={t("analytics.chart.portfolioValue")}
              stroke="#4f8cc9"
              fill="url(#portfolioValueGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="investedAmount"
              name={t("analytics.chart.investedAmount")}
              stroke="#8f9aa8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pnl"
              name={t("analytics.chart.pnl")}
              stroke={metrics.pnl >= 0 ? "#58a66c" : "#c55d5d"}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{t("performance.startingValue")}</p>
          <p className="text-sm font-semibold">{formatCurrencyMoney(metrics.startValue, chartCurrency, locale)}</p>
        </div>
        <div className="rounded-md bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{t("performance.currentValue")}</p>
          <p className="text-sm font-semibold">{formatCurrencyMoney(metrics.endValue, chartCurrency, locale)}</p>
        </div>
        <div className="rounded-md bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{t("performance.return")}</p>
          <p className={cn("text-sm font-semibold", metrics.returnPercent >= 0 ? "text-green-600" : "text-red-600")}>
            {metrics.returnPercent >= 0 ? "+" : ""}
            {metrics.returnPercent.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  )

  if (compact) return <div className={className}>{chart}</div>

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{t("performance.title")}</CardTitle>
        <CardDescription>{t("performance.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PerformancePeriod)} className="space-y-4">
          <TabsList className="flex flex-wrap">
            {periods.map((item) => (
              <TabsTrigger key={item} value={item}>
                {t(`analytics.period.${item}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeTab}>{chart}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
