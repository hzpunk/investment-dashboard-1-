"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { formatMoney } from "@/lib/currency/formatting"
import { getAssetTypeLabel } from "@/lib/i18n-display"
import { groupSmallAllocations } from "@/lib/finance"
import type { AllocationItem } from "@/lib/finance"

interface PortfolioAllocationProps {
  className?: string
  title?: string
  description?: string
  data?: Array<Partial<AllocationItem> & { type?: string; value: number }>
  totalValue?: number
  assetCount?: number
  largestPosition?: { symbol: string; percent: number } | null
  diversificationScore?: number
  group?: "type" | "asset" | "currency" | "sector"
  isLoading?: boolean
  currency?: string
}

type ChartAllocationItem = AllocationItem & {
  color: string
}

const TYPE_COLORS: Record<string, string> = {
  stock: "#4f8cc9",
  etf: "#6aa56f",
  crypto: "#8b6fc6",
  bond: "#c9a24f",
  commodity: "#c8795a",
  other: "#7f8a99",
  "other-small": "#7f8a99",
}

const SERIES_COLORS = ["#4f8cc9", "#6aa56f", "#8b6fc6", "#c9a24f", "#c8795a", "#6d9aa6", "#9a7f5f", "#7f8a99"]

function formatPercent(value: number, locale: string) {
  const normalizedValue = Number.isFinite(value) ? value : 0
  return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: normalizedValue < 10 ? 1 : 0,
  }).format(normalizedValue)}%`
}

function AllocationTooltip({
  active,
  payload,
  valueLabel,
  percentageLabel,
  locale,
  currency,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartAllocationItem }>
  valueLabel: string
  percentageLabel: string
  locale: string
  currency: string
}) {
  if (!active || !payload?.length) return null

  const item = payload[0].payload

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-medium">{item.label}</div>
      <div className="text-muted-foreground">
        {valueLabel}: {formatMoney(item.value, currency, locale as "ru" | "en")}
      </div>
      <div className="text-muted-foreground">
        {percentageLabel}: {formatPercent(item.percent, locale)}
      </div>
    </div>
  )
}

export function PortfolioAllocation({
  className,
  title,
  description,
  data = [],
  totalValue,
  assetCount,
  largestPosition,
  diversificationScore,
  group = "type",
  isLoading = false,
  currency,
}: PortfolioAllocationProps) {
  const { locale, t } = useI18n()
  const { displayCurrency } = useDisplayCurrency()
  const allocationCurrency = currency ?? displayCurrency
  const rawTotal = totalValue ?? data.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0)
  const normalized = data
    .map((item) => {
      const key = item.key ?? item.type ?? "other"
      const value = Number(item.value)
      return {
        key,
        label:
          item.label ??
          (group === "type" ? getAssetTypeLabel(key, t) : key === "other-small" ? t("analytics.allocation.other") : key),
        value,
        percent: item.percent ?? (rawTotal > 0 ? (value / rawTotal) * 100 : 0),
        count: item.count ?? 1,
      }
    })
    .filter((item) => Number.isFinite(item.value) && item.value > 0)

  const allocationData = groupSmallAllocations(normalized, {
    maxItems: 8,
    minPercent: 1,
    otherLabel: t("analytics.allocation.other"),
  })

  const chartData: ChartAllocationItem[] = allocationData.map((item, index) => ({
    ...item,
    color: TYPE_COLORS[item.key] ?? SERIES_COLORS[index % SERIES_COLORS.length],
  }))
  const chartTotal = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{title ?? t("portfolioAllocation.title")}</CardTitle>
        <CardDescription>{description ?? t("portfolioAllocation.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-5">
            <div className="flex h-[240px] items-center justify-center">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{t("portfolioAllocation.emptyTitle")}</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("portfolioAllocation.emptyDescription")}</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.85fr)_1.15fr]">
            <div className="space-y-4">
              <div className="relative h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="62%"
                      outerRadius="84%"
                      paddingAngle={2}
                      cornerRadius={4}
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      isAnimationActive={false}
                    >
                      {chartData.map((item) => (
                        <Cell key={item.key} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <AllocationTooltip
                          valueLabel={t("portfolioAllocation.value")}
                          percentageLabel={t("portfolioAllocation.percentage")}
                          locale={locale}
                          currency={allocationCurrency}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">{t("portfolioAllocation.total")}</p>
                    <p className="text-lg font-semibold tracking-tight text-foreground">{formatMoney(chartTotal, allocationCurrency, locale)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-muted-foreground">{t("analytics.summary.assetCount")}</span>
                  <span className="font-medium">{assetCount ?? chartData.reduce((sum, item) => sum + item.count, 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-muted-foreground">{t("analytics.summary.largestPosition")}</span>
                  <span className="font-medium">
                    {largestPosition ? `${largestPosition.symbol} · ${formatPercent(largestPosition.percent, locale)}` : t("common.notAvailable")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                  <span className="text-muted-foreground">{t("analytics.summary.diversificationScore")}</span>
                  <span className="font-medium">{typeof diversificationScore === "number" ? `${diversificationScore}/100` : t("common.notAvailable")}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {chartData.map((item) => (
                <div key={item.key} className="grid gap-2 rounded-md border border-border/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold text-foreground">{formatPercent(item.percent, locale)}</div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, item.percent)}%`, backgroundColor: item.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatMoney(item.value, allocationCurrency, locale)}</span>
                    <span>{item.count} {t("analytics.allocation.positions")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
