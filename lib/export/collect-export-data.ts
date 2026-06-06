import "server-only"

import { prisma } from "@/lib/prisma"
import { buildAnalyticsDto } from "@/lib/services/analytics"
import type { ResolvedAccountScope } from "@/lib/accounts/account-scope.server"
import type { AuthenticatedUser } from "@/lib/api-handler"
import { convertMoney } from "@/lib/currency/conversion"
import { getCbrCurrencyRates } from "@/lib/currency/rates"
import { formatDate, formatDateTime } from "@/lib/format/date"
import type {
  ExportAsset,
  ExportAuditSummary,
  ExportDataBundle,
  ExportHolding,
  ExportMetadata,
  ExportTransaction,
  NormalizedExportRequest,
} from "@/lib/export/types"

type CollectExportDataOptions = {
  userId: string
  user: AuthenticatedUser & { username?: string | null; role?: string | null }
  request: NormalizedExportRequest
  accountScope: ResolvedAccountScope
  appUrl: string
  qrCodeDataUrl?: string | null
  qrCodeSvg?: string | null
  initialWarnings?: string[]
}

export async function collectExportData(options: CollectExportDataOptions): Promise<ExportDataBundle> {
  const { userId, user, request, appUrl } = options
  const accountScope = options.accountScope
  const warnings = [...(options.initialWarnings ?? [])]
  const sections = request.sections
  const includeAnalytics =
    sections.portfolioSummary ||
    sections.analytics ||
    (sections.allocationChart && request.options.includeCharts) ||
    (sections.performanceChart && request.options.includeCharts) ||
    (accountScope.type === "single" && sections.holdings)

  const [profile, accountsRaw, portfoliosRaw, transactionsRaw, analytics, auditLogSummary] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: { select: { username: true } },
        roles: { select: { role: true }, take: 1, orderBy: { assignedAt: "desc" } },
      },
    }),
    sections.accounts
      ? prisma.account.findMany({
          where: { userId, ...accountScope.accountWhere },
          select: { name: true, type: true, balance: true, currency: true, createdAt: true },
          orderBy: { createdAt: "asc" },
          take: 1000,
        })
      : Promise.resolve([]),
    sections.holdings || sections.assets
      ? prisma.portfolio.findMany({
          where: accountScope.type === "single" ? { userId, id: "__account_scoped_holdings_are_transaction_derived__" } : { userId },
          select: {
            name: true,
            assets: {
              select: {
                quantity: true,
                averageBuyPrice: true,
                asset: {
                  select: {
                    symbol: true,
                    name: true,
                    type: true,
                    currentPrice: true,
                    currency: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    sections.transactions || sections.assets
      ? prisma.transaction.findMany({
          where: {
            userId,
            ...accountScope.transactionWhere,
            date: {
              gte: request.period.fromDate,
              lte: request.period.toDate,
            },
          },
          select: {
            date: true,
            type: true,
            quantity: true,
            pricePerUnit: true,
            totalAmount: true,
            fee: true,
            currency: true,
            notes: true,
            account: { select: { name: true } },
            asset: {
              select: {
                symbol: true,
                name: true,
                type: true,
                currentPrice: true,
                currency: true,
                updatedAt: true,
              },
            },
          },
          orderBy: { date: "desc" },
          take: 10000,
        })
      : Promise.resolve([]),
    includeAnalytics ? buildAnalyticsDto(userId, { fromDate: request.period.fromDate, toDate: request.period.toDate, accountScope, displayCurrency: request.options.currency }) : Promise.resolve(null),
    sections.auditLogSummary ? collectAuditSummary(userId, user.role ?? "user") : Promise.resolve(null),
  ])

  if (sections.auditLogSummary && (user.role ?? "user") !== "admin") {
    warnings.push("ADMIN_SECTION_SKIPPED:auditLogSummary")
  }

  const accountDisplayCurrency = request.options.currency.toUpperCase()
  const needsAccountRates = accountsRaw.some((account) => (account.currency || accountDisplayCurrency).toUpperCase() !== accountDisplayCurrency)
  const accountRates = needsAccountRates ? await getCbrCurrencyRates(request.period.toDate) : null
  if (needsAccountRates && !accountRates) {
    warnings.push("CURRENCY_RATE_UNAVAILABLE")
  }
  const accounts = accountsRaw.map((account) => {
    const originalCurrency = (account.currency || accountDisplayCurrency).toUpperCase()
    const converted =
      originalCurrency === accountDisplayCurrency
        ? null
        : accountRates
          ? convertMoney({ amount: account.balance, currency: originalCurrency }, accountDisplayCurrency, accountRates.rates, {
              stale: accountRates.stale,
            })
          : null

    return {
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      balanceDisplay:
        originalCurrency === accountDisplayCurrency
          ? account.balance
          : converted && !converted.error
            ? converted.converted.amount
            : null,
      currencyDisplay: accountDisplayCurrency,
      conversionStatus:
        originalCurrency === accountDisplayCurrency
          ? ("same-currency" as const)
          : converted && !converted.error
            ? ("converted" as const)
            : ("unavailable" as const),
      rateSource: converted && !converted.error ? converted.source ?? "CBR" : null,
      rateDate: converted && !converted.error ? converted.rateDate ?? accountRates?.date ?? null : null,
      createdAt: account.createdAt.toISOString(),
    }
  })

  const holdings: ExportHolding[] =
    accountScope.type === "single"
      ? (analytics?.positions ?? []).map((position) => ({
          portfolio: accountScope.account?.name ?? "Account",
          symbol: position.symbol,
          name: position.name,
          type: position.type,
          quantity: position.quantity,
          averageBuyPrice: position.averageBuyPrice,
          currentPrice: position.currentPrice,
          marketValue: position.marketValue,
          currency: position.currency,
        }))
      : portfoliosRaw.flatMap((portfolio): ExportHolding[] =>
          portfolio.assets.map((holding) => ({
            portfolio: portfolio.name,
            symbol: holding.asset.symbol,
            name: holding.asset.name,
            type: holding.asset.type,
            quantity: holding.quantity,
            averageBuyPrice: holding.averageBuyPrice,
            currentPrice: holding.asset.currentPrice,
            marketValue: Number((holding.quantity * holding.asset.currentPrice).toFixed(2)),
            currency: holding.asset.currency,
          })),
        )

  const transactions = transactionsRaw.map((transaction): ExportTransaction => ({
    date: transaction.date.toISOString(),
    type: transaction.type,
    symbol: transaction.asset?.symbol ?? "",
    assetName: transaction.asset?.name ?? "",
    quantity: transaction.quantity,
    pricePerUnit: transaction.pricePerUnit,
    totalAmount: transaction.totalAmount,
    fee: transaction.fee,
    currency: transaction.currency,
    account: transaction.account.name,
    notes: transaction.notes ?? "",
  }))

  const assets = collectUniqueAssets(portfoliosRaw, transactionsRaw)
  if (selectedDataCount({ accounts, assets, holdings, transactions, analytics }) === 0) {
    warnings.push("EXPORT_NO_DATA")
  }

  const generatedAt = new Date().toISOString()
  const metadata: ExportMetadata = {
    generatedAt,
    generatedAtFormatted: formatDateTime(generatedAt, request.options.language),
    title: request.options.title,
    subtitle: request.options.subtitle,
    appUrl,
    period: {
      type: request.period.type,
      from: request.period.from,
      to: request.period.to,
      fromFormatted: formatDate(request.period.from, request.options.language),
      toFormatted: formatDate(request.period.to, request.options.language),
      label: formatPeriodLabel(request.period.type, request.period.from, request.period.to, request.options.language),
    },
    dataSource: "PostgreSQL/Prisma",
    selectedSections: Object.entries(request.sections)
      .filter(([, selected]) => selected)
      .map(([key]) => key as ExportMetadata["selectedSections"][number]),
    format: request.format,
    language: request.options.language,
    currency: analytics?.currency?.baseCurrency ?? request.options.currency,
    pageSize: request.options.pageSize,
    orientation: request.options.orientation,
    options: request.options,
    warnings,
    accountScope: {
      type: accountScope.type,
      accountId: accountScope.accountId,
      accountName: accountScope.account?.name ?? null,
      accountCurrency: accountScope.account?.currency ?? null,
      baseCurrency: analytics?.currency?.baseCurrency ?? request.options.currency,
      conversionWarnings: analytics?.currency?.warnings ?? [],
      rateSource: "CBR",
      rateDate: analytics?.currency?.rateDate ?? null,
    },
  }

  return {
    metadata,
    user: {
      email: profile?.email ?? user.email,
      username: profile?.profile?.username ?? user.username ?? user.email.split("@")[0] ?? "User",
      role: String(profile?.roles?.[0]?.role ?? user.role ?? "user"),
    },
    portfolioSummary: sections.portfolioSummary ? analytics?.summary ?? null : undefined,
    accounts: sections.accounts || request.options.includeEmptySections ? accounts : undefined,
    assets: sections.assets || request.options.includeEmptySections ? assets : undefined,
    holdings: sections.holdings || request.options.includeEmptySections ? holdings : undefined,
    transactions: sections.transactions || request.options.includeEmptySections ? transactions : undefined,
    analytics: sections.analytics ? analytics : undefined,
    allocationChart: sections.allocationChart && request.options.includeCharts ? analytics?.allocation ?? null : undefined,
    performanceChart: sections.performanceChart && request.options.includeCharts ? analytics?.performance ?? null : undefined,
    calculators: sections.calculators
      ? {
          status: "not_available",
          note: "Calculator results are client-side and are not stored; export includes this placeholder only.",
        }
      : undefined,
    aiSummary: sections.aiSummary
      ? {
          status: "not_available",
          note: "AI chat summaries are generated on demand and are not exported unless saved by a future feature.",
        }
      : undefined,
    auditLogSummary: sections.auditLogSummary ? auditLogSummary : undefined,
    qrCodeDataUrl: request.options.includeQrCode ? options.qrCodeDataUrl ?? null : null,
    qrCodeSvg: request.options.includeQrCode ? options.qrCodeSvg ?? null : null,
    chartSnapshots: request.chartSnapshots,
  }
}

function formatPeriodLabel(type: ExportMetadata["period"]["type"], from: string, to: string, language: "ru" | "en") {
  if (type === "all") return language === "ru" ? "За все время" : "All time"
  const labels: Record<ExportMetadata["period"]["type"], { ru: string; en: string }> = {
    all: { ru: "За все время", en: "All time" },
    "7d": { ru: "Последние 7 дней", en: "Last 7 days" },
    "30d": { ru: "Последние 30 дней", en: "Last 30 days" },
    "3m": { ru: "Последние 3 месяца", en: "Last 3 months" },
    "1y": { ru: "Последний год", en: "Last year" },
    custom: { ru: "Произвольный период", en: "Custom period" },
  }
  const label = labels[type][language]
  return `${label}: ${formatDate(from, language)} - ${formatDate(to, language)}`
}

async function collectAuditSummary(userId: string, role: string): Promise<ExportAuditSummary | null> {
  if (role !== "admin") return null

  const [totalEvents, recentEvents] = await Promise.all([
    prisma.auditLog.count({ where: { userId } }),
    prisma.auditLog.findMany({
      where: { userId },
      select: { action: true, entityType: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return {
    totalEvents,
    recentEvents: recentEvents.map((event) => ({
      action: event.action,
      entityType: event.entityType,
      createdAt: event.createdAt.toISOString(),
    })),
  }
}

type AssetProjection = {
  symbol: string
  name: string
  type: string
  currentPrice: number
  currency: string
  updatedAt: Date
}
type PortfolioAssetProjection = { assets: Array<{ asset: AssetProjection }> }
type TransactionAssetProjection = { asset?: AssetProjection | null }

function collectUniqueAssets(portfolios: PortfolioAssetProjection[], transactions: TransactionAssetProjection[]): ExportAsset[] {
  const assets = new Map<string, ExportAsset>()

  for (const portfolio of portfolios) {
    for (const holding of portfolio.assets ?? []) {
      assets.set(holding.asset.symbol, {
        symbol: holding.asset.symbol,
        name: holding.asset.name,
        type: holding.asset.type,
        currentPrice: holding.asset.currentPrice,
        currency: holding.asset.currency,
        updatedAt: holding.asset.updatedAt.toISOString(),
      })
    }
  }

  for (const transaction of transactions) {
    const asset = transaction.asset
    if (!asset) continue
    assets.set(asset.symbol, {
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      currentPrice: asset.currentPrice,
      currency: asset.currency,
      updatedAt: asset.updatedAt.toISOString(),
    })
  }

  return Array.from(assets.values()).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

function selectedDataCount(input: {
  accounts: unknown[]
  assets: unknown[]
  holdings: unknown[]
  transactions: unknown[]
  analytics: unknown
}) {
  return input.accounts.length + input.assets.length + input.holdings.length + input.transactions.length + (input.analytics ? 1 : 0)
}
