import type { AnalyticsDto } from "@/lib/finance"
import {
  exportFormats,
  experimentalExportFormats,
  fullyImplementedExportFormats,
  getExportFormatDefinition,
  plannedExportFormats,
} from "@/lib/export/formats"

export {
  EXPORT_FORMATS,
  exportFormats,
  experimentalExportFormats,
  fullyImplementedExportFormats,
  getExportFormatDefinition,
  plannedExportFormats,
} from "@/lib/export/formats"

export type ExportFormat = (typeof exportFormats)[number]

export type ExportFormatStatus = "supported" | "experimental" | "planned"

export const exportSectionKeys = [
  "portfolioSummary",
  "accounts",
  "assets",
  "holdings",
  "transactions",
  "analytics",
  "allocationChart",
  "performanceChart",
  "calculators",
  "aiSummary",
  "auditLogSummary",
  "metadata",
] as const

export type ExportSectionKey = (typeof exportSectionKeys)[number]
export type ExportSections = Partial<Record<ExportSectionKey, boolean>>

export type ExportPeriodType = "all" | "7d" | "30d" | "3m" | "1y" | "custom"

export type ExportPeriod = {
  type: ExportPeriodType
  from?: string
  to?: string
}

export type ExportOptions = {
  title?: string
  subtitle?: string
  language?: "ru" | "en"
  currency?: string
  includeCharts?: boolean
  includeQrCode?: boolean
  includeAppLink?: boolean
  includeGeneratedAt?: boolean
  includeEmptySections?: boolean
  compactMode?: boolean
  detailedMode?: boolean
  exportAudience?: "user" | "technical"
  pageSize?: "A4"
  orientation?: "portrait" | "landscape"
}

export type ExportChartSnapshot = {
  id: "allocation" | "performance"
  title: string
  dataUrl: string
}

export type ExportRequest = {
  format: ExportFormat
  sections: ExportSections
  period?: ExportPeriod
  options?: ExportOptions
  chartSnapshots?: ExportChartSnapshot[]
}

export type ResolvedExportPeriod = {
  type: ExportPeriodType
  from: string
  to: string
  fromDate: Date
  toDate: Date
  label: string
}

export type NormalizedExportRequest = {
  format: ExportFormat
  formatStatus: ExportFormatStatus
  sections: Record<ExportSectionKey, boolean>
  period: ResolvedExportPeriod
  options: Required<ExportOptions>
  chartSnapshots: ExportChartSnapshot[]
}

export type ExportValidationResult =
  | { ok: true; request: NormalizedExportRequest; warnings: string[] }
  | { ok: false; code: string; message: string; details?: unknown }

export type ExportUserInfo = {
  email: string
  username: string
  role: string
}

export type ExportAccount = {
  name: string
  type: string
  balance: number
  currency: string
  createdAt: string
}

export type ExportAsset = {
  symbol: string
  name: string
  type: string
  currentPrice: number
  currency: string
  updatedAt: string
}

export type ExportHolding = {
  portfolio: string
  symbol: string
  name: string
  type: string
  quantity: number
  averageBuyPrice: number
  currentPrice: number
  marketValue: number
  currency: string
}

export type ExportTransaction = {
  date: string
  type: string
  symbol: string
  assetName: string
  quantity: number | null
  pricePerUnit: number | null
  totalAmount: number
  fee: number
  currency: string
  account: string
  notes: string
}

export type ExportAuditSummary = {
  totalEvents: number
  recentEvents: Array<{
    action: string
    entityType: string
    createdAt: string
  }>
}

export type ExportMetadata = {
  generatedAt: string
  generatedAtFormatted: string
  title: string
  subtitle: string
  appUrl: string
  period: {
    type: ExportPeriodType
    from: string
    to: string
    fromFormatted: string
    toFormatted: string
    label: string
  }
  dataSource: string
  selectedSections: ExportSectionKey[]
  format: ExportFormat
  language: "ru" | "en"
  currency: string
  pageSize: "A4"
  orientation: "portrait" | "landscape"
  options: Required<ExportOptions>
  warnings: string[]
}

export type ExportDataBundle = {
  metadata: ExportMetadata
  user: ExportUserInfo
  portfolioSummary?: AnalyticsDto["summary"] | null
  accounts?: ExportAccount[]
  assets?: ExportAsset[]
  holdings?: ExportHolding[]
  transactions?: ExportTransaction[]
  analytics?: AnalyticsDto | null
  allocationChart?: AnalyticsDto["allocation"] | null
  performanceChart?: AnalyticsDto["performance"] | null
  calculators?: {
    status: "not_available"
    note: string
  } | null
  aiSummary?: {
    status: "not_available"
    note: string
  } | null
  auditLogSummary?: ExportAuditSummary | null
  qrCodeDataUrl?: string | null
  qrCodeSvg?: string | null
  chartSnapshots?: ExportChartSnapshot[]
}

export type ExportPreviewSection = {
  key: ExportSectionKey
  title: string
  count?: number
  rows?: Record<string, unknown>[]
  note?: string
}

export type ExportPreview = {
  title: string
  subtitle: string
  metadata: ExportMetadata
  user: ExportUserInfo
  sections: ExportPreviewSection[]
  appUrl: string
  qrCodeSvg: string | null
  warnings: string[]
}

export type ExportSummaryWarningCode =
  | "NO_DATA_FOR_SECTION"
  | "CHARTS_AS_TABLE"
  | "CHARTS_AS_SVG"
  | "COMPACT_JSON"
  | "CHART_RENDER_FAILED"
  | "FORMAT_DOES_NOT_SUPPORT_CHARTS"
  | "FINANCIAL_SECTIONS_ONLY"
  | "PLANNED_FORMAT"

export type ExportSummaryWarning = {
  code: ExportSummaryWarningCode
  section?: ExportSectionKey
  format?: ExportFormat
}

export type ExportRecordEstimates = {
  accounts: number
  assets: number
  holdings: number
  transactions: number
  analyticsIncluded: boolean
  allocationRows: number
  performanceRows: number
  calculatorsIncluded: boolean
  aiSummaryIncluded: boolean
  auditEvents: number
}

export type ExportSectionDetail = {
  key: ExportSectionKey
  title: string
  fields: string[]
  recordCount: number | null
  sampleRows: Record<string, unknown>[]
  supportedByFormat: boolean
  note?: "willBeCalculated" | "noData" | "chartsAsSvg" | "chartsAsTable" | "compactJson" | "detailedJson"
}

export type ExportSummary = {
  format: ExportFormat
  formatStatus: ExportFormatStatus
  ready: boolean
  notReadyReason: string | null
  period: ExportMetadata["period"]
  selectedSections: ExportSectionKey[]
  estimatedRecords: ExportRecordEstimates
  options: Pick<
    Required<ExportOptions>,
    | "includeCharts"
    | "includeQrCode"
    | "includeAppLink"
    | "includeGeneratedAt"
    | "includeEmptySections"
    | "compactMode"
    | "detailedMode"
    | "exportAudience"
  >
  sectionDetails: Partial<Record<ExportSectionKey, ExportSectionDetail>>
  warnings: ExportSummaryWarning[]
}

export type ExportFile = {
  filename: string
  contentType: string
  body: string | Uint8Array
}

export const defaultExportSections: Record<ExportSectionKey, boolean> = {
  portfolioSummary: true,
  accounts: true,
  assets: true,
  holdings: true,
  transactions: true,
  analytics: true,
  allocationChart: true,
  performanceChart: true,
  calculators: false,
  aiSummary: false,
  auditLogSummary: false,
  metadata: true,
}

export const defaultExportOptions: Required<ExportOptions> = {
  title: "Investment report",
  subtitle: "",
  language: "ru",
  currency: "USD",
  includeCharts: true,
  includeQrCode: true,
  includeAppLink: true,
  includeGeneratedAt: true,
  includeEmptySections: false,
  compactMode: false,
  detailedMode: false,
  exportAudience: "user",
  pageSize: "A4",
  orientation: "portrait",
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return typeof value === "string" && exportFormats.includes(value as ExportFormat)
}

export function getExportFormatStatus(format: ExportFormat): ExportFormatStatus {
  if (getExportFormatDefinition(format).implemented) return "supported"
  if ((experimentalExportFormats as readonly string[]).includes(format)) return "experimental"
  return "planned"
}
