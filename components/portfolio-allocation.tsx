"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"

interface PortfolioAllocationProps {
  className?: string
  data?: Array<{
    type: string
    value: number
  }>
  isLoading?: boolean
}

type AllocationType = "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"

type AllocationItem = {
  type: AllocationType
  value: number
  percentage: number
}

const ASSET_TYPES: AllocationType[] = ["stock", "etf", "crypto", "bond", "commodity", "other"]

const TYPE_COLORS: Record<AllocationType, string> = {
  stock: "#4f8cc9",
  etf: "#6aa56f",
  crypto: "#8b6fc6",
  bond: "#c9a24f",
  commodity: "#c8795a",
  other: "#7f8a99",
}

function isAllocationType(type: string): type is AllocationType {
  return ASSET_TYPES.includes(type as AllocationType)
}

function normalizeAllocationData(data: PortfolioAllocationProps["data"] = []): AllocationItem[] {
  const totals = new Map<AllocationType, number>()

  for (const item of data) {
    if (!item || !Number.isFinite(item.value) || item.value <= 0) continue

    const rawType = item.type?.trim().toLowerCase() ?? ""
    const type = isAllocationType(rawType) ? rawType : "other"
    totals.set(type, (totals.get(type) ?? 0) + item.value)
  }

  const totalValue = Array.from(totals.values()).reduce((sum, value) => sum + value, 0)
  if (totalValue <= 0) return []

  return ASSET_TYPES.map((type) => ({
    type,
    value: totals.get(type) ?? 0,
    percentage: ((totals.get(type) ?? 0) / totalValue) * 100,
  })).filter((item) => item.value > 0)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatPercent(value: number) {
  const normalizedValue = Number.isFinite(value) ? value : 0
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: normalizedValue < 10 ? 1 : 0,
  }).format(normalizedValue)}%`
}

function AllocationTooltip({
  active,
  payload,
  valueLabel,
  percentageLabel,
}: {
  active?: boolean
  payload?: Array<{ payload: AllocationItem & { label: string } }>
  valueLabel: string
  percentageLabel: string
}) {
  if (!active || !payload?.length) return null

  const item = payload[0].payload

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="font-medium">{item.label}</div>
      <div className="text-muted-foreground">
        {valueLabel}: {formatCurrency(item.value)}
      </div>
      <div className="text-muted-foreground">
        {percentageLabel}: {formatPercent(item.percentage)}
      </div>
    </div>
  )
}

export function PortfolioAllocation({ className, data = [], isLoading = false }: PortfolioAllocationProps) {
  const { t } = useI18n()
  const allocationData = normalizeAllocationData(data)
  const totalValue = allocationData.reduce((sum, item) => sum + item.value, 0)
  const chartData = allocationData.map((item) => ({
    ...item,
    label: getAssetTypeLabel(item.type, t),
  }))

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{t("portfolioAllocation.title")}</CardTitle>
        <CardDescription>{t("portfolioAllocation.description")}</CardDescription>
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
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {t("portfolioAllocation.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="relative h-[240px] w-full">
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
                      <Cell key={item.type} fill={TYPE_COLORS[item.type]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <AllocationTooltip
                        valueLabel={t("portfolioAllocation.value")}
                        percentageLabel={t("portfolioAllocation.percentage")}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">{t("portfolioAllocation.total")}</p>
                  <p className="text-lg font-semibold tracking-tight text-foreground">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {chartData.map((item) => (
                <div key={item.type} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[item.type] }}
                    />
                    <span className="truncate text-sm text-foreground">{item.label}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-medium text-foreground">{formatPercent(item.percentage)}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(item.value)}</div>
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
