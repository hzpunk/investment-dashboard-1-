"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  DollarSign,
  LineChart,
  PieChart,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PerformanceChart } from "@/components/performance-chart"
import { PortfolioAllocation } from "@/components/portfolio-allocation"
import { AccountSwitcher } from "@/components/account-switcher"
import { CurrencyConversionWarning } from "@/components/currency-conversion-warning"
import { useI18n } from "@/contexts/i18n-context"
import { useSelectedAccount } from "@/hooks/use-selected-account"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { cn } from "@/lib/utils"
import { analyticsQuery } from "@/lib/query-options"
import { buildProjectionScenarios } from "@/lib/finance"
import type { AllocationGroup, AnalyticsDto, ProjectionScenario } from "@/lib/finance"
import { getAssetTypeLabel } from "@/lib/i18n-display"

type ProjectionForm = {
  initialAmount: number
  monthlyContribution: number
  annualReturnPercent: number
  horizonYears: number
  inflationPercent: number
}

const allocationTabs: AllocationGroup[] = ["type", "asset", "currency", "sector"]

function formatMoney(value: number, locale: string, currency = locale === "ru" ? "RUB" : "USD") {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatNumber(value: number, locale: string, digits = 2) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatPercent(value: number, locale: string) {
  const safeValue = Number.isFinite(value) ? value : 0
  return `${safeValue >= 0 ? "+" : ""}${formatNumber(safeValue, locale, 2)}%`
}

function formatDate(value: string | null, locale: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string
  helper?: string
  icon: typeof DollarSign
  tone?: "default" | "positive" | "negative" | "warning"
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
              className={cn(
                "mt-1 truncate text-xl font-semibold tracking-tight",
                tone === "positive" && "text-green-600",
                tone === "negative" && "text-red-600",
                tone === "warning" && "text-amber-600",
              )}
            >
              {value}
            </p>
            {helper ? <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p> : null}
          </div>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  )
}

function getAllocationData(analytics: AnalyticsDto, group: AllocationGroup) {
  if (group === "type") return analytics.allocation.byType
  if (group === "asset") return analytics.allocation.byAsset
  if (group === "currency") return analytics.allocation.byCurrency
  return analytics.allocation.bySector
}

function ProjectionSection({ analytics, currency }: { analytics: AnalyticsDto; currency: string }) {
  const { locale, t } = useI18n()
  const defaults = analytics.projectionDefaults
  const [form, setForm] = useState<ProjectionForm>({
    initialAmount: defaults.initialAmount,
    monthlyContribution: defaults.monthlyContribution,
    annualReturnPercent: defaults.annualReturnPercent,
    horizonYears: defaults.horizonYears,
    inflationPercent: defaults.inflationPercent,
  })

  const scenarios = useMemo(
    () =>
      buildProjectionScenarios({
        principal: form.initialAmount,
        monthlyContribution: form.monthlyContribution,
        annualRatePercent: form.annualReturnPercent,
        inflationRatePercent: form.inflationPercent,
        months: Math.max(0, Math.floor(form.horizonYears * 12)),
      }),
    [form],
  )

  const chartData = useMemo(() => {
    const basePoints = scenarios[1]?.points ?? []
    return basePoints.map((point, index) => ({
      month: point.month,
      conservative: scenarios[0]?.points[index]?.value ?? 0,
      base: scenarios[1]?.points[index]?.value ?? 0,
      optimistic: scenarios[2]?.points[index]?.value ?? 0,
    }))
  }, [scenarios])

  const updateField = (field: keyof ProjectionForm, value: string) => {
    const parsed = Number.parseFloat(value)
    setForm((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }))
  }

  const scenarioColor: Record<ProjectionScenario["id"], string> = {
    conservative: "#8f9aa8",
    base: "#4f8cc9",
    optimistic: "#6aa56f",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("analytics.projection.title")}</CardTitle>
        <CardDescription>{t("analytics.projection.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ["initialAmount", t("analytics.projection.initialAmount")],
            ["monthlyContribution", t("analytics.projection.monthlyContribution")],
            ["annualReturnPercent", t("analytics.projection.annualReturnPercent")],
            ["horizonYears", t("analytics.projection.horizonYears")],
            ["inflationPercent", t("analytics.projection.inflationPercent")],
          ].map(([field, label]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={`projection-${field}`}>{label}</Label>
              <Input
                id={`projection-${field}`}
                type="number"
                min="0"
                step={field === "horizonYears" ? "1" : field.includes("Percent") ? "0.1" : "100"}
                value={form[field as keyof ProjectionForm]}
                onChange={(event) => updateField(field as keyof ProjectionForm, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-md border border-border/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{t(`analytics.scenario.${scenario.id}`)}</p>
                <Badge variant="secondary">{formatNumber(scenario.annualReturnPercent, locale, 1)}%</Badge>
              </div>
              <p className="mt-3 text-2xl font-semibold">{formatMoney(scenario.finalValue, locale, currency)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("analytics.projection.inflationAdjusted")}: {formatMoney(scenario.inflationAdjustedFinalValue, locale, currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value: number) => `${Math.round(value / 12)}${t("analytics.projection.yearShort")}`}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatMoney(value, locale, currency),
                  t(`analytics.scenario.${name}`),
                ]}
                labelFormatter={(value: number) => `${t("analytics.projection.month")} ${value}`}
              />
              {scenarios.map((scenario) => (
                <Line
                  key={scenario.id}
                  type="monotone"
                  dataKey={scenario.id}
                  stroke={scenarioColor[scenario.id]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground">{t("analytics.projection.disclaimer")}</p>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { locale, t } = useI18n()
  const { scope, selectedAccount } = useSelectedAccount()
  const { displayCurrency } = useDisplayCurrency()
  const userId = user?.id ?? ""
  const analyticsResult = useQuery({
    ...analyticsQuery(userId, scope, displayCurrency),
    enabled: !isAuthLoading && Boolean(user),
  })
  const [allocationGroup, setAllocationGroup] = useState<AllocationGroup>("type")

  const analytics = analyticsResult.data
  const isLoading = !user ? false : analyticsResult.isLoading && !analytics
  const isRefreshing = analyticsResult.isFetching && !isLoading
  const error = analyticsResult.isError ? t("errors.unavailable") : null

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <DashboardHeader heading={t("analytics.title")} text={t("analytics.description")} />
        <Card>
          <CardContent className="flex min-h-[260px] items-center justify-center text-muted-foreground">
            {error ?? t("analytics.empty.noAnalytics")}
          </CardContent>
        </Card>
      </div>
    )
  }

  const summary = analytics.summary
  const analyticsCurrency = analytics.currency.baseCurrency
  const pnlTone = summary.totalPnL > 0 ? "positive" : summary.totalPnL < 0 ? "negative" : "default"
  const allocationData = getAllocationData(analytics, allocationGroup)

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("analytics.title")} text={t("analytics.description")}>
        {isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
        <AccountSwitcher compact />
      </DashboardHeader>
      <div className="rounded-md border border-border/70 px-4 py-3 text-sm text-muted-foreground">
        {t("accounts.currentScope")}: <span className="font-medium text-foreground">{selectedAccount?.name ?? t("accounts.allAccounts")}</span>
        <span className="ml-3">{t("currency.displayCurrency")}: <span className="font-medium text-foreground">{analyticsCurrency}</span></span>
      </div>
      <CurrencyConversionWarning
        status={analytics.currency.conversionStatus}
        stale={analytics.currency.stale}
        warnings={analytics.currency.warnings}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("analytics.summary.totalPortfolioValue")}
          value={formatMoney(summary.totalPortfolioValue, locale, analyticsCurrency)}
          helper={t(`analytics.source.${summary.source}`)}
          icon={DollarSign}
        />
        <MetricCard
          label={t("analytics.summary.totalInvested")}
          value={formatMoney(summary.totalInvested, locale, analyticsCurrency)}
          icon={Coins}
        />
        <MetricCard
          label={t("analytics.summary.totalPnl")}
          value={formatMoney(summary.totalPnL, locale, analyticsCurrency)}
          helper={formatPercent(summary.pnlPercent, locale)}
          icon={TrendingUp}
          tone={pnlTone}
        />
        <MetricCard
          label={t("analytics.summary.cashBalance")}
          value={formatMoney(summary.cashBalance, locale, analyticsCurrency)}
          icon={Wallet}
        />
        <MetricCard
          label={t("analytics.summary.assetCount")}
          value={formatNumber(summary.assetCount, locale, 0)}
          icon={PieChart}
        />
        <MetricCard
          label={t("analytics.summary.largestPosition")}
          value={summary.largestPosition ? summary.largestPosition.symbol : t("common.notAvailable")}
          helper={summary.largestPosition ? formatPercent(summary.largestPosition.percent, locale) : undefined}
          icon={ShieldAlert}
          tone={summary.largestPosition && summary.largestPosition.percent >= 35 ? "warning" : "default"}
        />
        <MetricCard
          label={t("analytics.summary.diversificationScore")}
          value={`${formatNumber(summary.diversificationScore, locale, 1)}/100`}
          icon={BarChart3}
          tone={summary.diversificationScore < 40 && summary.assetCount > 0 ? "warning" : "default"}
        />
        <MetricCard
          label={t("analytics.summary.updatedAt")}
          value={summary.updatedAt ? formatDate(summary.updatedAt, locale) : t("common.notAvailable")}
          icon={Clock}
        />
      </div>

      <PerformanceChart data={analytics.performance.byPeriod} period="1M" currency={analyticsCurrency} />

      <Tabs value={allocationGroup} onValueChange={(value) => setAllocationGroup(value as AllocationGroup)} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{t("analytics.allocation.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("analytics.allocation.description")}</p>
          </div>
          <TabsList className="flex flex-wrap">
            {allocationTabs.map((group) => (
              <TabsTrigger key={group} value={group}>
                {t(`analytics.allocation.${group}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={allocationGroup}>
          <PortfolioAllocation
            title={t("analytics.allocation.structureTitle")}
            description={t(`analytics.allocation.${allocationGroup}Description`)}
            data={allocationData}
            totalValue={analytics.allocation.totalValue}
            assetCount={summary.assetCount}
            largestPosition={summary.largestPosition}
            diversificationScore={summary.diversificationScore}
            group={allocationGroup}
            currency={analyticsCurrency}
          />
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.positions.title")}</CardTitle>
            <CardDescription>{t("analytics.positions.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.positions.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                {t("portfolioAllocation.emptyDescription")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.symbol")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead className="text-right">{t("common.quantity")}</TableHead>
                    <TableHead className="text-right">{t("analytics.positions.value")}</TableHead>
                    <TableHead className="text-right">{t("analytics.positions.pnl")}</TableHead>
                    <TableHead className="text-right">{t("portfolioAllocation.percentage")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.positions.map((position) => (
                    <TableRow key={position.assetId}>
                      <TableCell>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="max-w-[180px] truncate text-xs text-muted-foreground">{position.name}</div>
                      </TableCell>
                      <TableCell>{getAssetTypeLabel(position.type, t)}</TableCell>
                      <TableCell className="text-right">{formatNumber(position.quantity, locale, 6)}</TableCell>
                      <TableCell className="text-right">{formatMoney(position.marketValue, locale, position.currency || analyticsCurrency)}</TableCell>
                      <TableCell className={cn("text-right", position.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatMoney(position.unrealizedPnL, locale, position.currency || analyticsCurrency)}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(position.allocationPercent, locale, 1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.risk.title")}</CardTitle>
            <CardDescription>{t("analytics.risk.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("analytics.risk.concentration")}</p>
                <p className="text-lg font-semibold">{t(`analytics.risk.level.${analytics.risk.concentrationRisk}`)}</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("analytics.risk.cryptoShare")}</p>
                <p className="text-lg font-semibold">{formatNumber(analytics.risk.cryptoShare, locale, 1)}%</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("analytics.risk.cashShare")}</p>
                <p className="text-lg font-semibold">{formatNumber(analytics.risk.cashShare, locale, 1)}%</p>
              </div>
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("analytics.risk.stalePrices")}</p>
                <p className="text-lg font-semibold">{analytics.risk.stalePriceCount}</p>
              </div>
            </div>
            <div className="space-y-2">
              {analytics.risk.warnings.length === 0 ? (
                <div className="rounded-md border border-border/70 px-3 py-3 text-sm text-muted-foreground">
                  {t("analytics.risk.noWarnings")}
                </div>
              ) : (
                analytics.risk.warnings.map((warning) => (
                  <div key={warning.code} className="flex gap-3 rounded-md border border-border/70 px-3 py-3">
                    <AlertTriangle className={cn("mt-0.5 h-4 w-4", warning.severity === "warning" ? "text-amber-600" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-medium">{t(`analytics.risk.warning.${warning.code}`)}</p>
                      {typeof warning.value === "number" ? (
                        <p className="text-xs text-muted-foreground">{formatNumber(warning.value, locale, 1)}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectionSection analytics={analytics} currency={analyticsCurrency} />
    </div>
  )
}
