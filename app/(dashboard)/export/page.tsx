"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Download, Eye, FileDown } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { AccountSwitcher } from "@/components/account-switcher"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/contexts/i18n-context"
import { useSelectedAccount } from "@/hooks/use-selected-account"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { apiFetch } from "@/lib/api-client"
import {
  defaultExportOptions,
  defaultExportSections,
  exportFormats,
  exportSectionKeys,
  getExportFormatStatus,
  type ExportFormat,
  type ExportOptions,
  type ExportPeriod,
  type ExportPeriodType,
  type ExportRequest,
  type ExportSectionKey,
  type ExportSummary,
  type ExportSummaryWarning,
} from "@/lib/export/types"
import { fieldLabel, sectionLabel, type ExportFieldKey } from "@/lib/export/presentation/labels"

type SummaryResponse = {
  summary: ExportSummary
}

const documentFormats: ExportFormat[] = ["pdf", "docx", "txt"]
const dataFormats: ExportFormat[] = ["csv", "xlsx", "xls", "ods", "json", "xml"]
const financeFormats: ExportFormat[] = ["qif", "ofx", "mt940", "camt053"]
const periodTypes: ExportPeriodType[] = ["all", "7d", "30d", "3m", "1y", "custom"]

const sectionDescriptions: ExportSectionKey[] = [
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
]

export default function DataExportPage() {
  const { t, locale } = useI18n()
  const { scope, selectedAccount } = useSelectedAccount()
  const { displayCurrency } = useDisplayCurrency()
  const [format, setFormat] = useState<ExportFormat>("pdf")
  const [sections, setSections] = useState<Record<ExportSectionKey, boolean>>({ ...defaultExportSections })
  const [period, setPeriod] = useState<ExportPeriod>({ type: "all" })
  const [options, setOptions] = useState<Required<ExportOptions>>({
    ...defaultExportOptions,
    language: locale === "en" ? "en" : "ru",
    currency: displayCurrency,
    title: t("export.defaultTitle"),
  })
  const [summary, setSummary] = useState<ExportSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [activePreviewSection, setActivePreviewSection] = useState<ExportSectionKey>("accounts")

  useEffect(() => {
    setOptions((current) => ({ ...current, currency: displayCurrency }))
    setSummary(null)
  }, [displayCurrency])

  const selectedSectionCount = useMemo(
    () => exportSectionKeys.filter((key) => key !== "metadata" && sections[key]).length,
    [sections],
  )
  const canExport = selectedSectionCount > 0 && getExportFormatStatus(format) === "supported"
  const selectedFormatStatus = getExportFormatStatus(format)

  const request = useMemo<ExportRequest>(
    () => ({
      format,
      sections,
      period,
      options,
      chartSnapshots: [],
      accountScope: scope,
    }),
    [format, options, period, scope, sections],
  )

  const updateSection = (key: ExportSectionKey, value: boolean) => {
    setSections((current) => ({ ...current, [key]: value }))
    setSummary(null)
  }

  const updateOption = <K extends keyof ExportOptions>(key: K, value: Required<ExportOptions>[K]) => {
    setOptions((current) => ({ ...current, [key]: value }))
    setSummary(null)
  }

  const localSummary = useMemo<ExportSummary>(
    () => ({
      format,
      formatStatus: selectedFormatStatus,
      ready: canExport,
      notReadyReason: selectedSectionCount === 0 ? "EXPORT_NO_SECTIONS_SELECTED" : selectedFormatStatus !== "supported" ? "EXPORT_FORMAT_NOT_IMPLEMENTED" : null,
      period: {
        type: period.type,
        from: period.from ?? "",
        to: period.to ?? "",
        fromFormatted: period.from ?? "",
        toFormatted: period.to ?? "",
        label: t(`export.period.${period.type}`),
      },
      selectedSections: exportSectionKeys.filter((key) => sections[key]),
      estimatedRecords: {
        accounts: 0,
        assets: 0,
        holdings: 0,
        transactions: 0,
        analyticsIncluded: Boolean(sections.analytics),
        allocationRows: 0,
        performanceRows: 0,
        calculatorsIncluded: Boolean(sections.calculators),
        aiSummaryIncluded: Boolean(sections.aiSummary),
        auditEvents: 0,
      },
      options: {
        includeCharts: options.includeCharts,
        includeQrCode: options.includeQrCode,
        includeAppLink: options.includeAppLink,
        includeGeneratedAt: options.includeGeneratedAt,
        includeCbrRates: options.includeCbrRates,
        includeEmptySections: options.includeEmptySections,
        compactMode: options.compactMode,
        detailedMode: options.detailedMode,
        exportAudience: options.exportAudience,
      },
      sectionDetails: buildLocalSectionDetails(sections, options.language),
      warnings: selectedFormatStatus === "supported" ? [] : [{ code: "PLANNED_FORMAT", format }],
    }),
    [canExport, format, options, period, sections, selectedFormatStatus, selectedSectionCount, t],
  )

  const loadSummary = async () => {
    if (!canExport) return
    setLoadingSummary(true)
    setError(null)
    setStatus(null)
    try {
      const result = await apiFetch<SummaryResponse>("/api/export/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      setSummary(result.summary)
      setStatus(t("export.status.previewReady"))
    } catch (summaryError) {
      setError(getExportErrorMessage(t, summaryError))
    } finally {
      setLoadingSummary(false)
    }
  }

  const downloadExport = async () => {
    if (!canExport) return
    setDownloading(true)
    setError(null)
    setStatus(null)
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const code = payload?.ok === false ? payload.error.code : "EXPORT_GENERATION_FAILED"
        throw new Error(getExportErrorText(t, code))
      }

      const blob = await response.blob()
      const filename = getDownloadFilename(response.headers.get("Content-Disposition"), `investment-report.${format}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus(t("export.status.downloadStarted"))
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : t("export.errors.EXPORT_GENERATION_FAILED"))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("export.title")} text={t("export.description")} />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="export-no-print export-controls space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("accounts.currentScope")}</CardTitle>
              <CardDescription>{t("export.accountScope.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AccountSwitcher />
              <div className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground">
                {selectedAccount
                  ? `${t("export.accountScope.selected")}: ${selectedAccount.name} (${selectedAccount.currency})`
                  : t("export.accountScope.all")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("export.formats.title")}</CardTitle>
              <CardDescription>{t("export.formats.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormatGroup
                title={t("export.formats.documents")}
                formats={documentFormats}
                selected={format}
                onSelect={(nextFormat) => {
                  setFormat(nextFormat)
                  setSummary(null)
                }}
                t={t}
              />
              <FormatGroup
                title={t("export.formats.data")}
                formats={dataFormats}
                selected={format}
                onSelect={(nextFormat) => {
                  setFormat(nextFormat)
                  setSummary(null)
                }}
                t={t}
              />
              <FormatGroup
                title={t("export.formats.financial")}
                formats={financeFormats}
                selected={format}
                onSelect={(nextFormat) => {
                  setFormat(nextFormat)
                  setSummary(null)
                }}
                t={t}
              />
              <div className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground">
                {t(`export.status.${selectedFormatStatus}`)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("export.sections.title")}</CardTitle>
              <CardDescription>{t("export.sections.description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {sectionDescriptions.map((key) => (
                <label key={key} className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-3">
                  <Checkbox checked={sections[key]} onCheckedChange={(checked) => updateSection(key, checked === true)} />
                  <span className="grid gap-1 text-sm">
                    <span className="font-medium">{t(`export.sections.${key}`)}</span>
                    <span className="text-xs text-muted-foreground">{t(`export.sections.${key}Description`)}</span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("export.period.title")}</CardTitle>
              <CardDescription>{t("export.period.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={period.type}
                onValueChange={(value) => {
                  setPeriod({ type: value as ExportPeriodType })
                  setSummary(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodTypes.map((periodType) => (
                    <SelectItem key={periodType} value={periodType}>
                      {t(`export.period.${periodType}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {period.type === "custom" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("export.period.from")}</Label>
                    <Input
                      type="date"
                      value={period.from ?? ""}
                      onChange={(event) => {
                        setPeriod((current) => ({ ...current, from: event.target.value }))
                        setSummary(null)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("export.period.to")}</Label>
                    <Input
                      type="date"
                      value={period.to ?? ""}
                      onChange={(event) => {
                        setPeriod((current) => ({ ...current, to: event.target.value }))
                        setSummary(null)
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("export.options.title")}</CardTitle>
              <CardDescription>{t("export.options.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("export.options.documentTitle")}</Label>
                <Input value={options.title} onChange={(event) => updateOption("title", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("export.options.subtitle")}</Label>
                <Textarea value={options.subtitle} onChange={(event) => updateOption("subtitle", event.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("export.options.language")}</Label>
                  <Select value={options.language} onValueChange={(value) => updateOption("language", value as "ru" | "en")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">{t("language.ru")}</SelectItem>
                      <SelectItem value="en">{t("language.en")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("export.options.currency")}</Label>
                  <Input value={options.currency} onChange={(event) => updateOption("currency", event.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label>{t("export.options.orientation")}</Label>
                  <Select value={options.orientation} onValueChange={(value) => updateOption("orientation", value as "portrait" | "landscape")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">{t("export.options.portrait")}</SelectItem>
                      <SelectItem value="landscape">{t("export.options.landscape")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("export.options.pageSize")}</Label>
                  <Input value="A4" disabled />
                </div>
              </div>
              {(["includeCharts", "includeQrCode", "includeAppLink", "includeGeneratedAt", "includeCbrRates", "includeEmptySections", "compactMode", "detailedMode"] as const).map((key) => (
                <label key={key} className="flex items-center justify-between gap-4 rounded-md border border-border/70 px-3 py-2">
                  <span className="text-sm">{t(`export.options.${key}`)}</span>
                  <Switch checked={Boolean(options[key])} onCheckedChange={(checked) => updateOption(key, checked)} />
                </label>
              ))}
              <label className="flex items-center justify-between gap-4 rounded-md border border-border/70 px-3 py-2">
                <span className="text-sm">{t("export.options.exportAudienceTechnical")}</span>
                <Switch
                  checked={options.exportAudience === "technical"}
                  onCheckedChange={(checked) => updateOption("exportAudience", checked ? "technical" : "user")}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="export-no-print">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{format.toUpperCase()}</Badge>
                <span>{t("export.status.sectionsSelected").replace("{count}", String(selectedSectionCount))}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={loadSummary} disabled={!canExport || loadingSummary}>
                  <Eye className="mr-2 h-4 w-4" />
                  {loadingSummary ? t("export.status.loadingPreview") : t("export.actions.preview")}
                </Button>
                <Button onClick={downloadExport} disabled={!canExport || downloading}>
                  <Download className="mr-2 h-4 w-4" />
                  {downloading ? t("export.status.downloading") : t("export.actions.download")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {!canExport && (
            <Alert className="export-no-print">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("export.errors.title")}</AlertTitle>
              <AlertDescription>
                {selectedSectionCount === 0 ? t("export.errors.noSections") : t("export.errors.plannedFormat")}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="export-no-print">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("export.errors.title")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {status && (
            <Alert className="export-no-print">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{t("export.status.title")}</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          <ExportSummaryPanel
            summary={summary ?? localSummary}
            hasLoadedSummary={Boolean(summary)}
            activeSection={activePreviewSection}
            onActiveSectionChange={setActivePreviewSection}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

function FormatGroup({
  title,
  formats,
  selected,
  onSelect,
  t,
}: {
  title: string
  formats: ExportFormat[]
  selected: ExportFormat
  onSelect: (format: ExportFormat) => void
  t: (key: string) => string
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {formats.map((format) => {
          const status = getExportFormatStatus(format)
          const disabled = status !== "supported"
          return (
            <button
              key={format}
              type="button"
              onClick={() => {
                if (!disabled) onSelect(format)
              }}
              disabled={disabled}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selected === format
                  ? "border-primary bg-primary text-primary-foreground"
                  : disabled
                    ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-70"
                    : "border-border hover:bg-accent"
              }`}
            >
              <span className="block font-medium">{t(`export.formats.${format}`)}</span>
              <span className="block text-[11px] opacity-75">{t(`export.status.${status}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ExportSummaryPanel({
  summary,
  hasLoadedSummary,
  activeSection,
  onActiveSectionChange,
  t,
}: {
  summary: ExportSummary
  hasLoadedSummary: boolean
  activeSection: ExportSectionKey
  onActiveSectionChange: (section: ExportSectionKey) => void
  t: (key: string) => string
}) {
  const recordItems = [
    ["accounts", summary.estimatedRecords.accounts],
    ["assets", summary.estimatedRecords.assets],
    ["holdings", summary.estimatedRecords.holdings],
    ["transactions", summary.estimatedRecords.transactions],
    ["allocationChart", summary.estimatedRecords.allocationRows],
    ["performanceChart", summary.estimatedRecords.performanceRows],
  ] as const

  const optionItems = [
    ["includeCharts", summary.options.includeCharts],
    ["includeQrCode", summary.options.includeQrCode],
    ["includeAppLink", summary.options.includeAppLink],
    ["includeGeneratedAt", summary.options.includeGeneratedAt],
    ["includeCbrRates", summary.options.includeCbrRates],
    ["includeEmptySections", summary.options.includeEmptySections],
    ["compactMode", summary.options.compactMode],
    ["detailedMode", summary.options.detailedMode],
    ["exportAudienceTechnical", summary.options.exportAudience === "technical"],
  ] as const
  const selectedDetail = summary.sectionDetails[activeSection]

  return (
    <Card className="export-print-area">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{t("export.preview.title")}</CardTitle>
            <CardDescription>{t("export.preview.description")}</CardDescription>
          </div>
          <Badge variant={summary.ready ? "default" : "secondary"}>{summary.ready ? t("export.preview.ready") : t("export.preview.notReady")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasLoadedSummary && (
          <div className="flex items-start gap-3 rounded-md border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
            <FileDown className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("export.preview.emptyDescription")}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryMetric label={t("export.preview.format")} value={summary.format.toUpperCase()} />
          <SummaryMetric label={t("export.preview.period")} value={summary.period.label} />
          <SummaryMetric label={t("export.preview.contents")} value={String(summary.selectedSections.filter((key) => key !== "metadata").length)} />
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("export.preview.selectedSections")}</h3>
          <div className="flex flex-wrap gap-2">
            {summary.selectedSections.map((section) => (
              <Badge key={section} variant="outline">{t(`export.sections.${section}`)}</Badge>
            ))}
            {summary.selectedSections.length === 0 && <span className="text-sm text-muted-foreground">{t("export.preview.noSections")}</span>}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("export.preview.estimatedRecords")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {recordItems.map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => onActiveSectionChange(key)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  activeSection === key ? "border-primary bg-primary/10" : "border-border/70 hover:bg-accent"
                }`}
              >
                <span>{t(`export.sections.${key}`)}</span>
                <span className="font-medium">{hasLoadedSummary ? value : t("export.preview.notEstimated")}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onActiveSectionChange("analytics")}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                activeSection === "analytics" ? "border-primary bg-primary/10" : "border-border/70 hover:bg-accent"
              }`}
            >
              <span>{t("export.sections.analytics")}</span>
              <span className="font-medium">{summary.estimatedRecords.analyticsIncluded ? t("export.preview.included") : t("export.preview.notIncluded")}</span>
            </button>
          </div>
          <SectionDetailsPanel detail={selectedDetail} hasLoadedSummary={hasLoadedSummary} t={t} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("export.preview.options")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {optionItems.map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
                <span>{t(`export.options.${key}`)}</span>
                <Badge variant={enabled ? "default" : "outline"}>{enabled ? t("export.preview.included") : t("export.preview.notIncluded")}</Badge>
              </div>
            ))}
          </div>
        </section>

        {(summary.warnings.length > 0 || summary.notReadyReason) && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t("export.preview.warnings")}</h3>
            <div className="space-y-2">
              {summary.notReadyReason && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                  {getExportErrorText(t, summary.notReadyReason)}
                </div>
              )}
              {summary.warnings.map((warning, index) => (
                <div key={`${warning.code}-${warning.section ?? warning.format ?? index}`} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
                  {formatSummaryWarning(warning, t)}
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t pt-4 text-xs text-muted-foreground">{t("export.disclaimer")}</footer>
      </CardContent>
    </Card>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  )
}

function SectionDetailsPanel({
  detail,
  hasLoadedSummary,
  t,
}: {
  detail: ExportSummary["sectionDetails"][ExportSectionKey]
  hasLoadedSummary: boolean
  t: (key: string) => string
}) {
  if (!detail) {
    return (
      <div className="rounded-md border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
        {t("export.preview.willBeCalculated")}
      </div>
    )
  }

  const note = detail.note ? t(`export.preview.${detail.note}`) : null

  return (
    <div className="space-y-3 rounded-md border border-border/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{t("export.preview.sectionDetails")}</div>
          <div className="font-medium">{detail.title}</div>
        </div>
        <Badge variant="outline">
          {t("export.preview.recordsCount")}: {hasLoadedSummary ? detail.recordCount ?? t("export.preview.willBeCalculated") : t("export.preview.willBeCalculated")}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{t("export.preview.includedFields")}</div>
        <div className="flex flex-wrap gap-1.5">
          {detail.fields.map((field) => (
            <Badge key={field} variant="secondary" className="font-normal">
              {field}
            </Badge>
          ))}
        </div>
      </div>

      {note && <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{note}</div>}

      {hasLoadedSummary && detail.sampleRows.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{t("export.preview.sampleData")}</div>
          <div className="space-y-2">
            {detail.sampleRows.map((row, index) => (
              <div key={index} className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                {Object.entries(row)
                  .slice(0, 6)
                  .map(([key, value]) => `${key}: ${String(value ?? "")}`)
                  .join(" | ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasLoadedSummary && detail.sampleRows.length === 0 && <div className="text-sm text-muted-foreground">{t("export.preview.noData")}</div>}
    </div>
  )
}

function buildLocalSectionDetails(sections: Record<ExportSectionKey, boolean>, locale: "ru" | "en"): ExportSummary["sectionDetails"] {
  const details: ExportSummary["sectionDetails"] = {}
  const fields: Record<ExportSectionKey, ExportFieldKey[]> = {
    portfolioSummary: ["portfolioValue", "investedAmount", "cashBalance", "profitLoss", "returnPercent"],
    accounts: ["name", "type", "balance", "currency", "createdAt"],
    assets: ["symbol", "name", "type", "currentPrice", "currency", "updatedAt"],
    holdings: ["portfolio", "symbol", "quantity", "averageBuyPrice", "currentPrice", "marketValue"],
    transactions: ["date", "asset", "transactionType", "quantity", "pricePerUnit", "totalAmount", "fee"],
    analytics: ["returnPercent", "risk", "diversificationScore", "warnings"],
    allocationChart: ["asset", "value", "percent"],
    performanceChart: ["date", "portfolioValuePoint", "investedAmountPoint", "pnl", "pnlPercent"],
    calculators: ["status", "note"],
    aiSummary: ["status", "note"],
    auditLogSummary: ["action", "entityType", "createdAt"],
    metadata: ["generatedAt", "period", "applicationUrl"],
  }

  for (const key of exportSectionKeys) {
    if (!sections[key]) continue
    details[key] = {
      key,
      title: sectionLabel(key, locale),
      fields: fields[key].map((field) => fieldLabel(field, locale)),
      recordCount: null,
      sampleRows: [],
      supportedByFormat: true,
      note: "willBeCalculated",
    }
  }

  return details
}

function getDownloadFilename(disposition: string | null, fallback: string) {
  const match = /filename="([^"]+)"/.exec(disposition ?? "")
  return match?.[1] ?? fallback
}

function getExportErrorMessage(t: (key: string) => string, error: unknown) {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code?: unknown }).code) : "EXPORT_GENERATION_FAILED"
  return getExportErrorText(t, code)
}

function getExportErrorText(t: (key: string) => string, code: string) {
  const exportKey = `export.errors.${code}`
  const exportMessage = t(exportKey)
  if (exportMessage !== exportKey) return exportMessage

  const apiKey = `api.errors.${code}`
  const apiMessage = t(apiKey)
  return apiMessage === apiKey ? t("export.errors.EXPORT_GENERATION_FAILED") : apiMessage
}

function formatSummaryWarning(warning: ExportSummaryWarning, t: (key: string) => string) {
  if (warning.code === "NO_DATA_FOR_SECTION" && warning.section) {
    return t("export.preview.noDataForSection").replace("{section}", t(`export.sections.${warning.section}`))
  }

  if (warning.code === "FORMAT_DOES_NOT_SUPPORT_CHARTS" && warning.format) {
    return t("export.preview.formatNoCharts").replace("{format}", warning.format.toUpperCase())
  }

  if (warning.code === "PLANNED_FORMAT") {
    return t("export.preview.plannedFormat")
  }

  if (warning.code === "CHARTS_AS_SVG") return t("export.preview.chartsAsSvg")
  if (warning.code === "COMPACT_JSON") return t("export.preview.compactJson")
  if (warning.code === "FINANCIAL_SECTIONS_ONLY") return t("export.preview.financialSectionsOnly")
  if (warning.code === "CHART_RENDER_FAILED") return t("export.errors.EXPORT_CHART_RENDER_FAILED")

  return t("export.preview.chartsAsTable")
}
