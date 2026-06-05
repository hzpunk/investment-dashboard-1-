import type { ExportDataBundle, ExportSectionKey } from "@/lib/export/types"
import type { ExportFieldKey, ExportPresentationLocale } from "@/lib/export/presentation/labels"
import { fieldLabel, sectionLabel } from "@/lib/export/presentation/labels"
import { formatAccountType, formatAssetType, formatRisk, formatTransactionType } from "@/lib/export/presentation/enums"
import {
  formatExportCurrency,
  formatExportDate,
  formatExportDateTime,
  formatExportNumber,
  formatExportPercent,
} from "@/lib/export/presentation/format-values"
import { sanitizeExportData } from "@/lib/export/presentation/sanitize-export-data"

export type ExportViewSection = {
  key: ExportSectionKey
  title: string
  kind: "summary" | "table"
  rows: Record<string, unknown>[]
  summaryItems?: Array<{ label: string; value: string }>
}

export type ExportViewModel = {
  locale: ExportPresentationLocale
  sections: ExportViewSection[]
}

export function mapToExportViewModel(bundle: ExportDataBundle): ExportViewModel {
  const locale = bundle.metadata.language
  const currency = bundle.metadata.currency
  const selectedSections = new Set<ExportSectionKey>(bundle.metadata.selectedSections)
  const sections: ExportViewSection[] = []

  if (selectedSections.has("portfolioSummary") && bundle.portfolioSummary) {
    const largest = bundle.portfolioSummary.largestPosition
    const summaryItems = [
      item("portfolioValue", formatExportCurrency(bundle.portfolioSummary.totalPortfolioValue, currency, locale), locale),
      item("investedAmount", formatExportCurrency(bundle.portfolioSummary.totalInvested, currency, locale), locale),
      item("cashBalance", formatExportCurrency(bundle.portfolioSummary.cashBalance, currency, locale), locale),
      item("profitLoss", formatExportCurrency(bundle.portfolioSummary.totalPnL, currency, locale), locale),
      item("returnPercent", formatExportPercent(bundle.portfolioSummary.pnlPercent, locale), locale),
      item("assetCount", formatExportNumber(bundle.portfolioSummary.assetCount, locale, 0), locale),
      item("diversificationScore", formatExportNumber(bundle.portfolioSummary.diversificationScore, locale, 0), locale),
      item("largestPosition", largest ? `${largest.symbol} - ${formatExportPercent(largest.percent, locale)}` : "", locale),
    ].filter((entry) => entry.value !== "")

    sections.push({
      key: "portfolioSummary",
      title: sectionLabel("portfolioSummary", locale),
      kind: "summary",
      summaryItems,
      rows: [Object.fromEntries(summaryItems.map((entry) => [entry.label, entry.value]))],
    })
  }

  if (selectedSections.has("accounts") && bundle.accounts) {
    sections.push({
      key: "accounts",
      title: sectionLabel("accounts", locale),
      kind: "table",
      rows: bundle.accounts.map((account) =>
        row(locale, {
          name: account.name,
          type: formatAccountType(account.type, locale),
          balance: formatExportCurrency(account.balance, account.currency || currency, locale),
          currency: account.currency,
          createdAt: formatExportDate(account.createdAt, locale),
        }),
      ),
    })
  }

  if (selectedSections.has("assets") && bundle.assets) {
    sections.push({
      key: "assets",
      title: sectionLabel("assets", locale),
      kind: "table",
      rows: bundle.assets.map((asset) =>
        row(locale, {
          symbol: asset.symbol,
          name: asset.name,
          type: formatAssetType(asset.type, locale),
          currentPrice: formatExportCurrency(asset.currentPrice, asset.currency || currency, locale),
          currency: asset.currency,
          updatedAt: formatExportDate(asset.updatedAt, locale),
        }),
      ),
    })
  }

  if (selectedSections.has("holdings") && bundle.holdings) {
    sections.push({
      key: "holdings",
      title: sectionLabel("holdings", locale),
      kind: "table",
      rows: bundle.holdings.map((holding) =>
        row(locale, {
          portfolio: holding.portfolio,
          symbol: holding.symbol,
          name: holding.name,
          type: formatAssetType(holding.type, locale),
          quantity: formatExportNumber(holding.quantity, locale, 8),
          averageBuyPrice: formatExportCurrency(holding.averageBuyPrice, holding.currency || currency, locale),
          currentPrice: formatExportCurrency(holding.currentPrice, holding.currency || currency, locale),
          marketValue: formatExportCurrency(holding.marketValue, holding.currency || currency, locale),
          currency: holding.currency,
        }),
      ),
    })
  }

  if (selectedSections.has("transactions") && bundle.transactions) {
    sections.push({
      key: "transactions",
      title: sectionLabel("transactions", locale),
      kind: "table",
      rows: bundle.transactions.map((transaction) =>
        row(locale, {
          date: formatExportDate(transaction.date, locale),
          transactionType: formatTransactionType(transaction.type, locale),
          asset: transaction.assetName || transaction.symbol,
          symbol: transaction.symbol,
          quantity: transaction.quantity === null ? "" : formatExportNumber(transaction.quantity, locale, 8),
          pricePerUnit: transaction.pricePerUnit === null ? "" : formatExportCurrency(transaction.pricePerUnit, transaction.currency || currency, locale),
          totalAmount: formatExportCurrency(transaction.totalAmount, transaction.currency || currency, locale),
          fee: formatExportCurrency(transaction.fee, transaction.currency || currency, locale),
          account: transaction.account,
          comment: transaction.notes,
        }),
      ),
    })
  }

  if (selectedSections.has("analytics") && bundle.analytics) {
    sections.push({
      key: "analytics",
      title: sectionLabel("analytics", locale),
      kind: "table",
      rows: [
        row(locale, {
          simpleReturnPercent: formatExportPercent(bundle.analytics.performance.metrics.simpleReturnPercent, locale),
          cagrPercent: bundle.analytics.performance.metrics.cagrPercent === null ? "" : formatExportPercent(bundle.analytics.performance.metrics.cagrPercent, locale),
          volatilityPercent:
            bundle.analytics.performance.metrics.volatilityPercent === null ? "" : formatExportPercent(bundle.analytics.performance.metrics.volatilityPercent, locale),
          maxDrawdownPercent:
            bundle.analytics.performance.metrics.maxDrawdownPercent === null ? "" : formatExportPercent(bundle.analytics.performance.metrics.maxDrawdownPercent, locale),
          risk: formatRisk(bundle.analytics.risk.concentrationRisk, locale),
          warnings: bundle.analytics.risk.warnings.map((warning) => warning.code).join(", "),
        }),
      ],
    })
  }

  if (selectedSections.has("allocationChart") && bundle.allocationChart) {
    sections.push({
      key: "allocationChart",
      title: sectionLabel("allocationChart", locale),
      kind: "table",
      rows: bundle.allocationChart.byAsset.map((allocation) =>
        row(locale, {
          asset: allocation.label,
          value: formatExportCurrency(allocation.value, currency, locale),
          percent: formatExportPercent(allocation.percent, locale),
        }),
      ),
    })
  }

  if (selectedSections.has("performanceChart") && bundle.performanceChart) {
    sections.push({
      key: "performanceChart",
      title: sectionLabel("performanceChart", locale),
      kind: "table",
      rows: bundle.performanceChart.points.map((point) =>
        row(locale, {
          date: formatExportDate(point.date, locale),
          portfolioValuePoint: formatExportCurrency(point.portfolioValue, currency, locale),
          investedAmountPoint: formatExportCurrency(point.investedAmount, currency, locale),
          pnl: formatExportCurrency(point.pnl, currency, locale),
          pnlPercent: formatExportPercent(point.pnlPercent, locale),
        }),
      ),
    })
  }

  if (selectedSections.has("calculators") && bundle.calculators) {
    sections.push({
      key: "calculators",
      title: sectionLabel("calculators", locale),
      kind: "table",
      rows: [row(locale, { status: bundle.calculators.status, note: bundle.calculators.note })],
    })
  }

  if (selectedSections.has("aiSummary") && bundle.aiSummary) {
    sections.push({
      key: "aiSummary",
      title: sectionLabel("aiSummary", locale),
      kind: "table",
      rows: [row(locale, { status: bundle.aiSummary.status, note: bundle.aiSummary.note })],
    })
  }

  if (selectedSections.has("auditLogSummary") && bundle.auditLogSummary) {
    sections.push({
      key: "auditLogSummary",
      title: sectionLabel("auditLogSummary", locale),
      kind: "table",
      rows: bundle.auditLogSummary.recentEvents.map((event) =>
        row(locale, {
          action: event.action,
          entityType: event.entityType,
          createdAt: formatExportDateTime(event.createdAt, locale),
        }),
      ),
    })
  }

  if (selectedSections.has("metadata")) {
    sections.push({
      key: "metadata",
      title: sectionLabel("metadata", locale),
      kind: "table",
      rows: [
        row(locale, {
          generatedAt: bundle.metadata.generatedAtFormatted,
          period: bundle.metadata.period.label,
          applicationUrl: bundle.metadata.appUrl,
        }),
      ],
    })
  }

  return {
    locale,
    sections: sections.map((section) => ({
      ...section,
      rows: sanitizeExportData(section.rows),
      summaryItems: section.summaryItems ? sanitizeExportData(section.summaryItems) : undefined,
    })),
  }
}

export function buildPublicJsonExport(bundle: ExportDataBundle) {
  const locale = bundle.metadata.language
  const currency = bundle.metadata.currency
  const selectedSections = new Set<ExportSectionKey>(bundle.metadata.selectedSections)
  const projectionScenarios = bundle.analytics?.projectionDefaults.scenarios ?? []
  const base = {
    meta: {
      generatedAt: bundle.metadata.generatedAt,
      generatedAtFormatted: bundle.metadata.generatedAtFormatted,
      applicationUrl: bundle.metadata.appUrl,
      language: locale,
      currency,
      formatVersion: "1.0",
      period: {
        type: bundle.metadata.period.type,
        from: bundle.metadata.period.from,
        to: bundle.metadata.period.to,
        fromFormatted: bundle.metadata.period.fromFormatted,
        toFormatted: bundle.metadata.period.toFormatted,
        label: bundle.metadata.period.label,
      },
      sections: bundle.metadata.selectedSections.map((key) => sectionLabel(key, locale)),
    },
    portfolio: {
      summary: selectedSections.has("portfolioSummary") && bundle.portfolioSummary
        ? {
            portfolioValue: bundle.portfolioSummary.totalPortfolioValue,
            investedAmount: bundle.portfolioSummary.totalInvested,
            cashBalance: bundle.portfolioSummary.cashBalance,
            profitLoss: bundle.portfolioSummary.totalPnL,
            returnPercent: bundle.portfolioSummary.pnlPercent,
            assetCount: bundle.portfolioSummary.assetCount,
            largestPosition: bundle.portfolioSummary.largestPosition
              ? {
                  symbol: bundle.portfolioSummary.largestPosition.symbol,
                  name: bundle.portfolioSummary.largestPosition.name,
                  sharePercent: bundle.portfolioSummary.largestPosition.percent,
                }
              : null,
          }
        : null,
      accounts: selectedSections.has("accounts") ? (bundle.accounts ?? []).map((account) => ({
        name: account.name,
        type: formatAccountType(account.type, locale),
        balance: account.balance,
        currency: account.currency,
        createdAt: account.createdAt,
        createdAtFormatted: formatExportDate(account.createdAt, locale),
      })) : [],
      assets: selectedSections.has("assets") ? (bundle.assets ?? []).map((asset) => ({
        symbol: asset.symbol,
        name: asset.name,
        type: formatAssetType(asset.type, locale),
        currentPrice: asset.currentPrice,
        currency: asset.currency,
        updatedAt: asset.updatedAt,
        updatedAtFormatted: formatExportDate(asset.updatedAt, locale),
      })) : [],
      holdings: selectedSections.has("holdings") ? (bundle.holdings ?? []).map((holding) => ({
        portfolio: holding.portfolio,
        symbol: holding.symbol,
        name: holding.name,
        type: formatAssetType(holding.type, locale),
        quantity: holding.quantity,
        averagePurchasePrice: holding.averageBuyPrice,
        currentPrice: holding.currentPrice,
        marketValue: holding.marketValue,
        currency: holding.currency,
      })) : [],
      transactions: selectedSections.has("transactions") ? (bundle.transactions ?? []).map((transaction) => ({
        date: transaction.date,
        dateFormatted: formatExportDate(transaction.date, locale),
        type: formatTransactionType(transaction.type, locale),
        asset: transaction.assetName || transaction.symbol,
        symbol: transaction.symbol,
        quantity: transaction.quantity,
        pricePerUnit: transaction.pricePerUnit,
        amount: transaction.totalAmount,
        fee: transaction.fee,
        currency: transaction.currency,
        account: transaction.account,
        comment: transaction.notes,
      })) : [],
    },
    analytics: {
      allocation: selectedSections.has("allocationChart") || selectedSections.has("analytics") ? (bundle.allocationChart?.byAsset ?? bundle.analytics?.allocation.byAsset ?? []).map((item) => ({
        asset: item.label,
        value: item.value,
        sharePercent: item.percent,
      })) : [],
      performance: {
        summary: selectedSections.has("performanceChart") || selectedSections.has("analytics")
          ? summarizePerformance(bundle.performanceChart?.points ?? bundle.analytics?.performance.points ?? [], locale)
          : summarizePerformance([], locale),
      },
      projectionSummary: selectedSections.has("analytics") ? projectionScenarios.map((scenario) => ({
        scenario: scenario.id,
        annualReturnPercent: scenario.annualReturnPercent,
        finalValue: scenario.finalValue,
        inflationAdjustedFinalValue: scenario.inflationAdjustedFinalValue,
      })) : [],
    },
  }

  if (bundle.metadata.options.exportAudience !== "technical" && !bundle.metadata.options.detailedMode) {
    return sanitizeExportData(base)
  }

  return sanitizeExportData({
    ...base,
    technical: {
      performancePoints: bundle.performanceChart?.points ?? bundle.analytics?.performance.points ?? [],
      projectionDetails: bundle.metadata.options.detailedMode ? { scenarios: projectionScenarios } : undefined,
    },
  })
}

function row(locale: ExportPresentationLocale, values: Partial<Record<ExportFieldKey, unknown>>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [fieldLabel(key as ExportFieldKey, locale), value]),
  )
}

function item(key: ExportFieldKey, value: string, locale: ExportPresentationLocale) {
  return { label: fieldLabel(key, locale), value }
}

function summarizePerformance(points: Array<{ date: string; portfolioValue: number; investedAmount?: number; pnl?: number; pnlPercent?: number }>, locale: ExportPresentationLocale) {
  if (points.length === 0) {
    return { pointsCount: 0, currentValue: 0, investedAmount: 0, profitLoss: 0, returnPercent: 0 }
  }
  const last = points[points.length - 1]
  return {
    pointsCount: points.length,
    lastDate: last.date,
    lastDateFormatted: formatExportDate(last.date, locale),
    currentValue: last.portfolioValue,
    investedAmount: last.investedAmount ?? 0,
    profitLoss: last.pnl ?? 0,
    returnPercent: last.pnlPercent ?? 0,
  }
}
