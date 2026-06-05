import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import DataExportPage from "@/app/(dashboard)/export/page"

const mockApiFetch = jest.fn()

jest.mock("@/components/dashboard-header", () => ({
  DashboardHeader: ({ heading, text }: { heading: string; text?: string }) => (
    <header>
      <h1>{heading}</h1>
      {text ? <p>{text}</p> : null}
    </header>
  ),
}))

jest.mock("@/contexts/i18n-context", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string) => translations[key] ?? key,
  }),
}))

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client")
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  }
})

const translations: Record<string, string> = {
  "export.title": "Data export",
  "export.description": "Create exports",
  "export.defaultTitle": "Investment report",
  "export.actions.preview": "Preview",
  "export.actions.download": "Download",
  "export.formats.title": "File format",
  "export.formats.description": "Choose format",
  "export.formats.documents": "Documents",
  "export.formats.data": "Data",
  "export.formats.financial": "Financial",
  "export.formats.pdf": "PDF",
  "export.formats.docx": "DOCX",
  "export.formats.txt": "TXT",
  "export.formats.html": "HTML",
  "export.formats.csv": "CSV",
  "export.formats.xlsx": "XLSX",
  "export.formats.xls": "XLS",
  "export.formats.ods": "ODS",
  "export.formats.json": "JSON",
  "export.formats.xml": "XML",
  "export.formats.qif": "QIF",
  "export.formats.ofx": "OFX",
  "export.formats.mt940": "MT940",
  "export.formats.camt053": "CAMT.053",
  "export.status.supported": "Supported",
  "export.status.experimental": "Experimental",
  "export.status.planned": "Planned",
  "export.status.sectionsSelected": "Sections selected: {count}",
  "export.status.loadingPreview": "Preparing preview...",
  "export.status.previewReady": "Preview ready",
  "export.status.downloading": "Downloading...",
  "export.status.downloadStarted": "Download started",
  "export.status.title": "Status",
  "export.sections.title": "Sections",
  "export.sections.description": "Choose sections",
  "export.period.title": "Period",
  "export.period.description": "Choose period",
  "export.period.all": "All time",
  "export.period.7d": "Last 7 days",
  "export.period.30d": "Last 30 days",
  "export.period.3m": "Last 3 months",
  "export.period.1y": "Last year",
  "export.period.custom": "Custom",
  "export.options.title": "Options",
  "export.options.description": "Document options",
  "export.options.documentTitle": "Document title",
  "export.options.subtitle": "Subtitle",
  "export.options.language": "Language",
  "export.options.currency": "Currency",
  "export.options.orientation": "Orientation",
  "export.options.portrait": "Portrait",
  "export.options.landscape": "Landscape",
  "export.options.pageSize": "Page size",
  "export.options.includeCharts": "Include charts",
  "export.options.includeQrCode": "Include QR code",
  "export.options.includeAppLink": "Include app link",
  "export.options.includeGeneratedAt": "Include timestamp",
  "export.options.includeEmptySections": "Include empty sections",
  "export.options.compactMode": "Compact",
  "export.options.detailedMode": "Detailed JSON",
  "export.options.exportAudienceTechnical": "Technical export",
  "export.preview.button": "Preview",
  "export.preview.title": "Export contents",
  "export.preview.description": "Summary preview",
  "export.preview.contents": "Sections",
  "export.preview.format": "Format",
  "export.preview.estimatedRecords": "Estimated records",
  "export.preview.selectedSections": "Selected sections",
  "export.preview.options": "Options",
  "export.preview.warnings": "Warnings",
  "export.preview.ready": "Ready",
  "export.preview.notReady": "Not ready",
  "export.preview.plannedFormat": "Planned",
  "export.preview.noSections": "No sections",
  "export.preview.chartsAsTable": "Charts as table",
  "export.preview.chartsAsSvg": "Charts as SVG",
  "export.preview.financialSectionsOnly": "Financial sections only",
  "export.preview.compactJson": "Compact JSON",
  "export.preview.detailedJson": "Detailed JSON",
  "export.preview.sectionDetails": "Section",
  "export.preview.recordsCount": "Records",
  "export.preview.includedFields": "Included fields",
  "export.preview.willBeCalculated": "Will be calculated",
  "export.preview.sampleData": "Sample data",
  "export.preview.notEstimated": "Click Preview",
  "export.preview.included": "Included",
  "export.preview.notIncluded": "Not included",
  "export.preview.noDataForSection": "No data for {section}",
  "export.preview.formatNoCharts": "{format} has no charts",
  "export.preview.emptyTitle": "No preview",
  "export.preview.emptyDescription": "Generate preview",
  "export.preview.generatedAt": "Generated",
  "export.preview.period": "Period",
  "export.preview.user": "User",
  "export.preview.appLink": "Application",
  "export.preview.noData": "No data",
  "export.print": "Print",
  "export.download": "Download",
  "export.disclaimer": "Disclaimer",
  "export.errors.title": "Export error",
  "export.errors.noSections": "No sections",
  "export.errors.plannedFormat": "Planned format",
  "export.errors.EXPORT_GENERATION_FAILED": "Export failed",
  "export.errors.EXPORT_CHART_RENDER_FAILED": "Chart render failed",
  "language.ru": "Russian",
  "language.en": "English",
}

for (const key of [
  "portfolioSummary", "accounts", "assets", "holdings", "transactions", "analytics", "allocationChart", "performanceChart",
  "calculators", "aiSummary", "auditLogSummary", "metadata",
]) {
  translations[`export.sections.${key}`] = key
  translations[`export.sections.${key}Description`] = `${key} description`
}

describe("DataExportPage", () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
    global.fetch = jest.fn() as jest.Mock
  })

  it("renders controls and disables export when no data sections are selected", () => {
    render(<DataExportPage />)

    expect(screen.getByRole("heading", { name: "Data export" })).toBeInTheDocument()
    for (const checkbox of screen.getAllByRole("checkbox")) {
      if (checkbox.getAttribute("data-state") === "checked") {
        fireEvent.click(checkbox)
      }
    }

    expect(screen.getByRole("button", { name: /Download/i })).toBeDisabled()
  })

  it("loads summary and opens section details without rendering a print action", async () => {
    mockApiFetch.mockResolvedValueOnce({
      summary: {
        format: "pdf",
        formatStatus: "supported",
        ready: true,
        notReadyReason: null,
        period: {
          type: "all",
          from: "1970-01-01T00:00:00.000Z",
          to: "2026-06-04T10:00:00.000Z",
          fromFormatted: "01.01.1970",
          toFormatted: "06.04.2026",
          label: "All time",
        },
        selectedSections: ["accounts", "metadata"],
        estimatedRecords: {
          accounts: 1,
          assets: 0,
          holdings: 0,
          transactions: 0,
          analyticsIncluded: false,
          allocationRows: 0,
          performanceRows: 0,
          calculatorsIncluded: false,
          aiSummaryIncluded: false,
          auditEvents: 0,
        },
        options: {
          includeCharts: true,
          includeQrCode: true,
          includeAppLink: true,
          includeGeneratedAt: true,
          includeEmptySections: false,
          compactMode: false,
          detailedMode: false,
          exportAudience: "user",
        },
        sectionDetails: {
          accounts: {
            key: "accounts",
            title: "Accounts",
            fields: ["name", "type", "balance", "currency"],
            recordCount: 1,
            sampleRows: [{ name: "Brokerage", type: "brokerage", balance: 100, currency: "USD" }],
            supportedByFormat: true,
          },
        },
        warnings: [],
      },
    })

    render(<DataExportPage />)
    fireEvent.click(screen.getByRole("button", { name: /^Preview$/i }))

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/api/export/summary", expect.any(Object)))
    expect(screen.getAllByText("1").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /Print/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /^accounts/i }))
    expect(screen.getByText("Included fields")).toBeInTheDocument()
    expect(screen.getByText("name")).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
