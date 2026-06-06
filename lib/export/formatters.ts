import {
  defaultExportOptions,
  exportSectionKeys,
  fullyImplementedExportFormats,
  getExportFormatStatus,
  isExportFormat,
  plannedExportFormats,
  type ExportDataBundle,
  type ExportFile,
  type ExportFormat,
  type ExportOptions,
  type ExportPreview,
  type ExportPreviewSection,
  type ExportRequest,
  type ExportChartSnapshot,
  type ExportRecordEstimates,
  type ExportSectionKey,
  type ExportSummary,
  type ExportSummaryWarning,
  type ExportValidationResult,
  type ResolvedExportPeriod,
} from "@/lib/export/types"
import {
  formatDate as formatDisplayDate,
  formatDateForFileName,
  formatDateTime as formatDisplayDateTime,
} from "@/lib/format/date"
import { EXPORT_FIELD_LABELS, fieldLabel, sectionLabel, type ExportFieldKey } from "@/lib/export/presentation/labels"
import { normalizeAccountScope } from "@/lib/accounts/account-scope"

const secretKeyPattern = /(password|token|secret|cookie|session|api[_-]?key|database[_-]?url|auth)/i
const financialFormats = new Set<ExportFormat>(["qif", "ofx", "mt940", "camt053"])
const financialUnsupportedSections = new Set<ExportSectionKey>([
  "portfolioSummary",
  "analytics",
  "allocationChart",
  "performanceChart",
  "calculators",
  "aiSummary",
  "auditLogSummary",
])

export function normalizeExportRequest(input: unknown, now = new Date()): ExportValidationResult {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request" }
  }

  const body = input as ExportRequest
  if (!isExportFormat(body.format)) {
    return { ok: false, code: "EXPORT_FORMAT_NOT_SUPPORTED", message: "Export format is not supported", details: { format: body.format } }
  }

  const sectionsValidation = normalizeSections((body as { sections?: unknown }).sections)
  if (!sectionsValidation.ok) return sectionsValidation

  const sections = sectionsValidation.sections
  if (!exportSectionKeys.some((key) => key !== "metadata" && sections[key])) {
    return { ok: false, code: "EXPORT_NO_SECTIONS_SELECTED", message: "No export sections selected" }
  }

  const formatStatus = getExportFormatStatus(body.format)
  if (!(fullyImplementedExportFormats as readonly string[]).includes(body.format) || (plannedExportFormats as readonly string[]).includes(body.format)) {
    return {
      ok: false,
      code: "EXPORT_FORMAT_NOT_IMPLEMENTED",
      message: "Export format is not implemented",
      details: { format: body.format },
    }
  }

  const optionsValidation = normalizeOptions((body as { options?: unknown }).options)
  if (!optionsValidation.ok) return optionsValidation

  const options = {
    ...defaultExportOptions,
    ...optionsValidation.options,
  }

  const period = resolveExportPeriod(body.period, now)
  if (!period) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { period: "Invalid export period" } }
  }

  const chartSnapshotsValidation = normalizeChartSnapshots((body as { chartSnapshots?: unknown }).chartSnapshots)
  if (!chartSnapshotsValidation.ok) {
    return chartSnapshotsValidation
  }

  const warnings: string[] = []
  if (formatStatus === "experimental") {
    warnings.push(`FORMAT_EXPERIMENTAL:${body.format}`)
  }

  return {
    ok: true,
    request: {
      format: body.format,
      formatStatus,
      sections,
      period,
      options: {
        ...options,
        title: trimText(options.title, 120) || defaultExportOptions.title,
        subtitle: trimText(options.subtitle, 500),
        language: options.language,
        currency: trimText(options.currency, 12) || defaultExportOptions.currency,
        pageSize: "A4",
        orientation: options.orientation,
        exportAudience: options.exportAudience,
      },
      chartSnapshots: chartSnapshotsValidation.chartSnapshots,
      accountScope: normalizeRequestAccountScope((body as { accountScope?: unknown; accountId?: unknown }).accountScope ?? (body as { accountId?: unknown }).accountId),
    },
    warnings,
  }
}

function normalizeRequestAccountScope(value: unknown) {
  if (value && typeof value === "object" && "type" in value) {
    const scope = value as { type?: unknown; accountId?: unknown }
    if (scope.type === "single") return normalizeAccountScope(scope.accountId)
    return normalizeAccountScope("all")
  }
  return normalizeAccountScope(value)
}

export function resolveExportPeriod(period: ExportRequest["period"] | undefined, now = new Date()): ResolvedExportPeriod | null {
  const type = period?.type ?? "all"
  const toDate = parseDateOrNull(period?.to) ?? now
  let fromDate: Date

  switch (type) {
    case "7d":
      fromDate = addDays(toDate, -7)
      break
    case "30d":
      fromDate = addDays(toDate, -30)
      break
    case "3m":
      fromDate = addMonths(toDate, -3)
      break
    case "1y":
      fromDate = addMonths(toDate, -12)
      break
    case "custom":
      if (!period?.from || !period?.to) return null
      fromDate = parseDateOrNull(period.from) ?? new Date(Number.NaN)
      break
    case "all":
      fromDate = new Date(0)
      break
    default:
      return null
  }

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
    return null
  }

  return {
    type,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    fromDate,
    toDate,
    label: type === "all" ? "All time" : `${formatDate(fromDate)} - ${formatDate(toDate)}`,
  }
}

export function csvEscape(value: unknown, separator = ";") {
  const raw = normalizeCsvCell(value)
  const escaped = raw.replaceAll('"', '""')
  return escaped.includes(separator) || escaped.includes("\n") || escaped.includes("\r") || escaped.includes('"') ? `"${escaped}"` : escaped
}

function normalizeCsvCell(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value)
    .replaceAll("\u00A0", " ")
    .replaceAll("\u202F", " ")
}

export function rowsToCsv(rows: Record<string, unknown>[], separator = ";") {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const lines = [headers.map((header) => csvEscape(header, separator)).join(separator)]
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header], separator)).join(separator))
  }
  return lines.join("\n")
}

export function sectionedCsv(sections: Array<{ title: string; rows: Record<string, unknown>[] }>, separator = ";") {
  return sections
    .filter((section) => section.rows.length > 0)
    .map((section) => [csvEscape(section.title, separator), rowsToCsv(section.rows, separator)].filter(Boolean).join("\n"))
    .join("\n\n")
}

export function rowsToText(title: string, rows: Record<string, unknown>[], limit = 50) {
  const lines = [`## ${title}`]
  if (rows.length === 0) {
    lines.push("No data")
    return lines.join("\n")
  }

  rows.slice(0, limit).forEach((row, index) => {
    lines.push(`${index + 1}. ${Object.entries(row).map(([key, value]) => `${key}: ${value ?? ""}`).join(" | ")}`)
  })

  if (rows.length > limit) lines.push(`... ${rows.length - limit} more rows`)
  return lines.join("\n")
}

export function formatCurrency(value: number | null | undefined, currency = "USD") {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0"
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(numeric)
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(numeric)
}

export function formatPercent(value: number | null | undefined) {
  return `${formatNumber(value, 2)}%`
}

export function formatDate(value: Date | string | null | undefined) {
  return formatDisplayDate(value, "en")
}

export function safeFilename(value: string, extension: ExportFormat) {
  const base = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
  return `${base || "investment-report"}-${formatDateForFileName(new Date())}.${extension}`
}

export function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripSecrets(item)) as T
  if (!value || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !secretKeyPattern.test(key))
      .map(([key, nested]) => [key, stripSecrets(nested)]),
  ) as T
}

export function buildPreview(bundle: ExportDataBundle): ExportPreview {
  const sections: ExportPreviewSection[] = []

  if (bundle.portfolioSummary) {
    sections.push({
      key: "portfolioSummary",
      title: "Portfolio summary",
      rows: [bundle.portfolioSummary as unknown as Record<string, unknown>],
    })
  }

  addRows(sections, "accounts", "Accounts", bundle.accounts)
  addRows(sections, "assets", "Assets", bundle.assets)
  addRows(sections, "holdings", "Holdings", bundle.holdings)
  addRows(sections, "transactions", "Transactions", bundle.transactions)

  if (bundle.analytics) {
    sections.push({
      key: "analytics",
      title: "Analytics",
      rows: [
        {
          totalValue: bundle.analytics.summary.totalPortfolioValue,
          totalPnL: bundle.analytics.summary.totalPnL,
          pnlPercent: bundle.analytics.summary.pnlPercent,
          diversificationScore: bundle.analytics.summary.diversificationScore,
        },
      ],
    })
  }

  if (bundle.allocationChart) {
    sections.push({
      key: "allocationChart",
      title: "Allocation chart",
      count: bundle.allocationChart.byAsset.length,
      rows: bundle.allocationChart.byAsset.slice(0, 12) as unknown as Record<string, unknown>[],
      note: "Chart preview is rendered from allocation data.",
    })
  }

  if (bundle.performanceChart) {
    sections.push({
      key: "performanceChart",
      title: "Performance chart",
      count: bundle.performanceChart.points.length,
      rows: bundle.performanceChart.points.slice(-12) as unknown as Record<string, unknown>[],
      note: "Chart data will be exported as a table if no chart snapshot is provided.",
    })
  }

  if (bundle.calculators) sections.push({ key: "calculators", title: "Calculators", note: bundle.calculators.note })
  if (bundle.aiSummary) sections.push({ key: "aiSummary", title: "AI summary", note: bundle.aiSummary.note })
  if (bundle.auditLogSummary) {
    sections.push({
      key: "auditLogSummary",
      title: "Audit summary",
      count: bundle.auditLogSummary.totalEvents,
      rows: bundle.auditLogSummary.recentEvents,
    })
  }

  return {
    title: bundle.metadata.title,
    subtitle: bundle.metadata.subtitle || bundle.metadata.period.label,
    metadata: bundle.metadata,
    user: bundle.user,
    sections,
    appUrl: bundle.metadata.appUrl,
    qrCodeSvg: bundle.qrCodeSvg ?? null,
    warnings: bundle.metadata.warnings,
  }
}

export function buildExportSummary(bundle: ExportDataBundle): ExportSummary {
  const selectedSections = bundle.metadata.selectedSections
  const estimatedRecords: ExportRecordEstimates = {
    accounts: bundle.accounts?.length ?? 0,
    assets: bundle.assets?.length ?? 0,
    holdings: bundle.holdings?.length ?? 0,
    transactions: bundle.transactions?.length ?? 0,
    analyticsIncluded: Boolean(bundle.analytics),
    allocationRows: bundle.allocationChart?.byAsset.length ?? 0,
    performanceRows: bundle.performanceChart?.points.length ?? 0,
    calculatorsIncluded: Boolean(bundle.calculators),
    aiSummaryIncluded: Boolean(bundle.aiSummary),
    auditEvents: bundle.auditLogSummary?.totalEvents ?? 0,
  }
  const warnings: ExportSummaryWarning[] = []

  for (const key of ["accounts", "assets", "holdings", "transactions"] as const) {
    if (selectedSections.includes(key) && estimatedRecords[key] === 0) {
      warnings.push({ code: "NO_DATA_FOR_SECTION", section: key })
    }
  }

  if (selectedSections.includes("allocationChart") && estimatedRecords.allocationRows === 0) {
    warnings.push({ code: "NO_DATA_FOR_SECTION", section: "allocationChart" })
  }

  if (selectedSections.includes("performanceChart") && estimatedRecords.performanceRows === 0) {
    warnings.push({ code: "NO_DATA_FOR_SECTION", section: "performanceChart" })
  }

  if (bundle.metadata.format === "docx" && hasSelectedChartData(bundle)) {
    warnings.push({ code: "CHARTS_AS_TABLE", format: bundle.metadata.format })
  }

  if (bundle.metadata.format === "json" && !bundle.metadata.options.detailedMode && bundle.analytics?.projectionDefaults.scenarios.length) {
    warnings.push({ code: "COMPACT_JSON", format: bundle.metadata.format })
  }

  if (
    financialFormats.has(bundle.metadata.format) &&
    selectedSections.some((section) => financialUnsupportedSections.has(section))
  ) {
    warnings.push({ code: "FINANCIAL_SECTIONS_ONLY", format: bundle.metadata.format })
  }

  return {
    format: bundle.metadata.format,
    formatStatus: getExportFormatStatus(bundle.metadata.format),
    ready: true,
    notReadyReason: null,
    period: bundle.metadata.period,
    selectedSections,
    estimatedRecords,
    options: {
      includeCharts: bundle.metadata.options.includeCharts,
      includeQrCode: bundle.metadata.options.includeQrCode,
      includeAppLink: bundle.metadata.options.includeAppLink,
      includeGeneratedAt: bundle.metadata.options.includeGeneratedAt,
      includeCbrRates: bundle.metadata.options.includeCbrRates,
      includeEmptySections: bundle.metadata.options.includeEmptySections,
      compactMode: bundle.metadata.options.compactMode,
      detailedMode: bundle.metadata.options.detailedMode,
      exportAudience: bundle.metadata.options.exportAudience,
    },
    sectionDetails: buildSectionDetails(bundle, estimatedRecords),
    warnings,
  }
}

function hasSelectedChartData(bundle: ExportDataBundle) {
  return (
    (bundle.metadata.selectedSections.includes("allocationChart") && (bundle.allocationChart?.byAsset.length ?? 0) > 0) ||
    (bundle.metadata.selectedSections.includes("performanceChart") && (bundle.performanceChart?.points.length ?? 0) > 0)
  )
}

function buildSectionDetails(bundle: ExportDataBundle, estimates: ExportRecordEstimates): ExportSummary["sectionDetails"] {
  const format = bundle.metadata.format
  const locale = bundle.metadata.language
  const chartNote = format === "pdf" ? "chartsAsSvg" : format === "docx" ? "chartsAsTable" : undefined
  const details: ExportSummary["sectionDetails"] = {
    portfolioSummary: {
      key: "portfolioSummary",
      title: sectionLabel("portfolioSummary", locale),
      fields: labels(locale, ["portfolioValue", "investedAmount", "cashBalance", "profitLoss", "returnPercent", "assetCount", "diversificationScore"]),
      recordCount: bundle.portfolioSummary ? 1 : 0,
      sampleRows: bundle.portfolioSummary ? [sampleObject(bundle.portfolioSummary)] : [],
      supportedByFormat: true,
      note: bundle.portfolioSummary ? undefined : "noData",
    },
    accounts: {
      key: "accounts",
      title: sectionLabel("accounts", locale),
      fields: labels(locale, ["name", "type", "balance", "currency", "createdAt"]),
      recordCount: estimates.accounts,
      sampleRows: sampleRows(bundle.accounts, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.accounts > 0 ? undefined : "noData",
    },
    assets: {
      key: "assets",
      title: sectionLabel("assets", locale),
      fields: labels(locale, ["symbol", "name", "type", "currentPrice", "currency", "updatedAt"]),
      recordCount: estimates.assets,
      sampleRows: sampleRows(bundle.assets, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.assets > 0 ? undefined : "noData",
    },
    holdings: {
      key: "holdings",
      title: sectionLabel("holdings", locale),
      fields: labels(locale, ["portfolio", "symbol", "quantity", "averageBuyPrice", "currentPrice", "marketValue", "currency"]),
      recordCount: estimates.holdings,
      sampleRows: sampleRows(bundle.holdings, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.holdings > 0 ? undefined : "noData",
    },
    transactions: {
      key: "transactions",
      title: sectionLabel("transactions", locale),
      fields: labels(locale, ["date", "asset", "transactionType", "quantity", "pricePerUnit", "totalAmount", "fee", "account"]),
      recordCount: estimates.transactions,
      sampleRows: sampleRows(bundle.transactions, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.transactions > 0 ? undefined : "noData",
    },
    analytics: {
      key: "analytics",
      title: sectionLabel("analytics", locale),
      fields: labels(locale, ["simpleReturnPercent", "cagrPercent", "volatilityPercent", "maxDrawdownPercent", "risk", "warnings"]),
      recordCount: estimates.analyticsIncluded ? 1 : 0,
      sampleRows: bundle.analytics
        ? [
            {
              totalPortfolioValue: bundle.analytics.summary.totalPortfolioValue,
              totalPnL: bundle.analytics.summary.totalPnL,
              pnlPercent: bundle.analytics.summary.pnlPercent,
            },
          ]
        : [],
      supportedByFormat: true,
      note: estimates.analyticsIncluded ? undefined : "noData",
    },
    allocationChart: {
      key: "allocationChart",
      title: sectionLabel("allocationChart", locale),
      fields: labels(locale, ["asset", "value", "percent"]),
      recordCount: estimates.allocationRows,
      sampleRows: sampleRows(bundle.allocationChart?.byAsset, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.allocationRows > 0 ? chartNote : "noData",
    },
    performanceChart: {
      key: "performanceChart",
      title: sectionLabel("performanceChart", locale),
      fields: labels(locale, ["date", "portfolioValuePoint", "investedAmountPoint", "pnl", "pnlPercent"]),
      recordCount: estimates.performanceRows,
      sampleRows: sampleRows(bundle.performanceChart?.points, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.performanceRows > 0 ? chartNote : "noData",
    },
    calculators: {
      key: "calculators",
      title: sectionLabel("calculators", locale),
      fields: labels(locale, ["status", "note"]),
      recordCount: bundle.calculators ? 1 : 0,
      sampleRows: bundle.calculators ? [bundle.calculators] : [],
      supportedByFormat: true,
      note: bundle.calculators ? "willBeCalculated" : "noData",
    },
    aiSummary: {
      key: "aiSummary",
      title: sectionLabel("aiSummary", locale),
      fields: labels(locale, ["status", "note"]),
      recordCount: bundle.aiSummary ? 1 : 0,
      sampleRows: bundle.aiSummary ? [bundle.aiSummary] : [],
      supportedByFormat: true,
      note: bundle.aiSummary ? "willBeCalculated" : "noData",
    },
    auditLogSummary: {
      key: "auditLogSummary",
      title: sectionLabel("auditLogSummary", locale),
      fields: labels(locale, ["action", "entityType", "createdAt"]),
      recordCount: estimates.auditEvents,
      sampleRows: sampleRows(bundle.auditLogSummary?.recentEvents, bundle.metadata.language),
      supportedByFormat: true,
      note: estimates.auditEvents > 0 ? undefined : "noData",
    },
    metadata: {
      key: "metadata",
      title: sectionLabel("metadata", locale),
      fields: labels(locale, ["generatedAt", "period", "applicationUrl"]),
      recordCount: 1,
      sampleRows: [
        {
          generatedAt: bundle.metadata.generatedAtFormatted,
          period: bundle.metadata.period.label,
          appUrl: bundle.metadata.appUrl,
        },
      ],
      supportedByFormat: true,
    },
  }

  return Object.fromEntries(
    Object.entries(details).filter(([key]) => bundle.metadata.selectedSections.includes(key as ExportSectionKey)),
  ) as ExportSummary["sectionDetails"]
}

function labels(locale: "ru" | "en", keys: ExportFieldKey[]) {
  return keys.map((key) => fieldLabel(key, locale))
}

function sampleRows(rows: unknown[] | null | undefined, language: "ru" | "en") {
  return (rows ?? []).slice(0, 3).map((row) => formatSampleObject(row, language))
}

function sampleObject(value: unknown) {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  return Object.fromEntries(Object.entries(raw).slice(0, 8))
}

function formatSampleObject(value: unknown, language: "ru" | "en") {
  const raw = sampleObject(value)
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([key]) => !/(^id$|id$|^key$|userId|assetId|portfolioId|accountId|qrCode|chartSnapshots)/i.test(key))
      .map(([key, nested]) => [
        sampleFieldLabel(key, language),
        typeof nested === "string" && /(^date$|at$|date$)/i.test(key) ? formatDisplayDateTime(nested, language) : nested,
      ]),
  )
}

function sampleFieldLabel(key: string, language: "ru" | "en") {
  const alias: Record<string, ExportFieldKey> = {
    totalPortfolioValue: "portfolioValue",
    totalInvested: "investedAmount",
    totalPnL: "profitLoss",
    pnlPercent: "returnPercent",
    assetName: "asset",
    label: "asset",
    appUrl: "applicationUrl",
  }
  const fieldKey = alias[key] ?? key
  return (EXPORT_FIELD_LABELS[language] as Record<string, string>)[fieldKey] ?? key
}

export function buildExportFile(filename: string, contentType: string, body: string | Uint8Array): ExportFile {
  return { filename, contentType, body }
}

function addRows<T extends Record<string, unknown>>(sections: ExportPreviewSection[], key: ExportSectionKey, title: string, rows?: T[]) {
  if (!rows) return
  sections.push({
    key,
    title,
    count: rows.length,
    rows: rows.slice(0, 12),
  })
}

function normalizeSections(input: unknown):
  | { ok: true; sections: Record<ExportSectionKey, boolean> }
  | Extract<ExportValidationResult, { ok: false }> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "EXPORT_NO_SECTIONS_SELECTED", message: "No export sections selected" }
  }

  const raw = input as Record<string, unknown>
  const sections = Object.fromEntries(exportSectionKeys.map((key) => [key, raw[key] === true])) as Record<ExportSectionKey, boolean>
  return { ok: true, sections }
}

function normalizeOptions(input: unknown):
  | { ok: true; options: Partial<ExportOptions> }
  | Extract<ExportValidationResult, { ok: false }> {
  if (input === undefined || input === null) return { ok: true, options: {} }
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { options: "Options must be an object" } }
  }

  const options = input as Record<string, unknown>
  if (options.language !== undefined && options.language !== "ru" && options.language !== "en") {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { language: "Expected ru or en" } }
  }

  if (options.orientation !== undefined && options.orientation !== "portrait" && options.orientation !== "landscape") {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { orientation: "Expected portrait or landscape" } }
  }

  if (options.exportAudience !== undefined && options.exportAudience !== "user" && options.exportAudience !== "technical") {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { exportAudience: "Expected user or technical" } }
  }

  if (options.pageSize !== undefined && options.pageSize !== "A4") {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { pageSize: "Expected A4" } }
  }

  for (const key of [
    "includeCharts",
    "includeQrCode",
    "includeAppLink",
    "includeGeneratedAt",
    "includeCbrRates",
    "includeEmptySections",
    "compactMode",
    "detailedMode",
  ]) {
    if (options[key] !== undefined && typeof options[key] !== "boolean") {
      return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { [key]: "Expected boolean" } }
    }
  }

  return { ok: true, options: options as Partial<ExportOptions> }
}

function normalizeChartSnapshots(input: unknown):
  | { ok: true; chartSnapshots: ExportChartSnapshot[] }
  | Extract<ExportValidationResult, { ok: false }> {
  if (input === undefined || input === null) return { ok: true, chartSnapshots: [] }
  if (!Array.isArray(input)) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { chartSnapshots: "Chart snapshots must be an array" } }
  }

  const invalid = input.find((item) => !isValidChartSnapshot(item))
  if (invalid) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { chartSnapshots: "Invalid chart snapshot" } }
  }

  return { ok: true, chartSnapshots: input.slice(0, 4) as ExportChartSnapshot[] }
}

function parseDateOrNull(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addDays(value: Date, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function addMonths(value: Date, months: number) {
  const date = new Date(value)
  date.setMonth(date.getMonth() + months)
  return date
}

function trimText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function isValidChartSnapshot(value: unknown) {
  if (!value || typeof value !== "object") return false
  const item = value as { id?: unknown; title?: unknown; dataUrl?: unknown }
  return (
    (item.id === "allocation" || item.id === "performance") &&
    typeof item.title === "string" &&
    typeof item.dataUrl === "string" &&
    item.dataUrl.startsWith("data:image/")
  )
}
