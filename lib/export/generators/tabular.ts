import * as XLSX from "xlsx"
import type { ExportDataBundle, ExportFile, ExportFormat } from "@/lib/export/types"
import { buildExportFile, rowsToText, safeFilename, sectionedCsv, stripSecrets } from "@/lib/export/formatters"
import { buildPublicJsonExport, mapToExportViewModel, type ExportViewSection } from "@/lib/export/presentation/export-view-model"

const UTF8_BOM = "\uFEFF"

export function generateCsvExport(bundle: ExportDataBundle): ExportFile {
  const sections = tableSections(bundle)
  const body = sectionedCsv(sections)
  return buildExportFile(safeFilename(bundle.metadata.title, "csv"), "text/csv; charset=utf-8", UTF8_BOM + (body || "No data"))
}

export function generateTxtExport(bundle: ExportDataBundle): ExportFile {
  const lines = [
    bundle.metadata.title,
    bundle.metadata.subtitle,
    `Generated: ${bundle.metadata.generatedAtFormatted}`,
    `User: ${bundle.user.email}`,
    `Period: ${bundle.metadata.period.label}`,
    bundle.metadata.appUrl ? `Application: ${bundle.metadata.appUrl}` : "",
    "",
    ...tableSections(bundle).map((section) => rowsToText(section.title, section.rows, bundle.metadata.selectedSections.length > 4 ? 30 : 80)),
    "",
    "Disclaimer: Calculations are approximate and are not investment, financial, or tax advice.",
  ].filter(Boolean)

  return buildExportFile(safeFilename(bundle.metadata.title, "txt"), "text/plain; charset=utf-8", lines.join("\n\n"))
}

export function generateJsonExport(bundle: ExportDataBundle): ExportFile {
  const body = buildPublicJsonExport(bundle)
  return buildExportFile(
    safeFilename(bundle.metadata.title, "json"),
    "application/json; charset=utf-8",
    JSON.stringify(stripSecrets(body), null, 2),
  )
}

export function generateHtmlExport(bundle: ExportDataBundle): ExportFile {
  const sections = tableSections(bundle)
  const body = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>${escapeXml(bundle.metadata.title)}</title>`,
    "  <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}table{border-collapse:collapse;width:100%;margin:12px 0 28px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f3f4f6}footer{margin-top:32px;color:#666;font-size:12px}.qr{float:right;width:120px;height:120px}</style>",
    "</head>",
    "<body>",
    bundle.qrCodeSvg ? `<div class="qr">${bundle.qrCodeSvg}</div>` : "",
    `<h1>${escapeXml(bundle.metadata.title)}</h1>`,
    bundle.metadata.subtitle ? `<p>${escapeXml(bundle.metadata.subtitle)}</p>` : "",
    `<p>Generated: ${escapeXml(bundle.metadata.generatedAtFormatted)}<br/>Period: ${escapeXml(bundle.metadata.period.label)}<br/>User: ${escapeXml(bundle.user.email)}<br/>Application: ${escapeXml(bundle.metadata.appUrl)}</p>`,
    ...sections.map((section) => renderHtmlTable(section.title, section.rows)),
    "<footer>Calculations are approximate and are not investment, financial, or tax advice.</footer>",
    "</body>",
    "</html>",
  ].join("\n")

  return buildExportFile(safeFilename(bundle.metadata.title, "html"), "text/html; charset=utf-8", body)
}

export function generateXmlExport(bundle: ExportDataBundle): ExportFile {
  const body = buildPublicXmlExport(bundle)
  return buildExportFile(safeFilename(bundle.metadata.title, "xml"), "application/xml; charset=utf-8", body)
}

function buildPublicXmlExport(bundle: ExportDataBundle) {
  const data = buildPublicJsonExport(bundle) as PublicExportJson
  const currency = data.meta.currency
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<investmentReport version="1.0" language="${escapeXml(data.meta.language)}">`,
    "  <metadata>",
    xmlElement("generatedAt", data.meta.generatedAt, {}, 4),
    xmlElement("generatedAtFormatted", data.meta.generatedAtFormatted, {}, 4),
    xmlElement("applicationUrl", data.meta.applicationUrl, {}, 4),
    xmlElement("period", data.meta.period.label, {}, 4),
    "  </metadata>",
    "  <portfolio>",
    ...renderPortfolioXml(data, currency),
    "  </portfolio>",
    "  <analytics>",
    ...renderAnalyticsXml(data, currency),
    "  </analytics>",
    "</investmentReport>",
  ]

  return lines.filter(Boolean).join("\n")
}

function renderPortfolioXml(data: PublicExportJson, currency: string) {
  const summary = data.portfolio.summary
  const lines: string[] = []
  if (summary) {
    lines.push("    <summary>")
    lines.push(xmlElement("portfolioValue", summary.portfolioValue, { currency }, 6))
    lines.push(xmlElement("investedAmount", summary.investedAmount, { currency }, 6))
    lines.push(xmlElement("cashBalance", summary.cashBalance, { currency }, 6))
    lines.push(xmlElement("profitLoss", summary.profitLoss, { currency }, 6))
    lines.push(xmlElement("returnPercent", summary.returnPercent, {}, 6))
    lines.push(xmlElement("assetCount", summary.assetCount, {}, 6))
    if (summary.largestPosition) {
      lines.push("      <largestPosition>")
      lines.push(xmlElement("symbol", summary.largestPosition.symbol, {}, 8))
      lines.push(xmlElement("name", summary.largestPosition.name, {}, 8))
      lines.push(xmlElement("sharePercent", summary.largestPosition.sharePercent, {}, 8))
      lines.push("      </largestPosition>")
    }
    lines.push("    </summary>")
  }

  lines.push(renderListXml("accounts", "account", data.portfolio.accounts, 4, (account) => [
    xmlElement("name", account.name, {}, 6),
    xmlElement("type", account.type, {}, 6),
    xmlElement("balance", account.balance, { currency: account.currency || currency }, 6),
    xmlElement("currency", account.currency, {}, 6),
    xmlElement("createdAt", account.createdAtFormatted || account.createdAt, {}, 6),
  ]))

  lines.push(renderListXml("assets", "asset", data.portfolio.assets, 4, (asset) => [
    xmlElement("symbol", asset.symbol, {}, 6),
    xmlElement("name", asset.name, {}, 6),
    xmlElement("type", asset.type, {}, 6),
    xmlElement("currentPrice", asset.currentPrice, { currency: asset.currency || currency }, 6),
    xmlElement("currency", asset.currency, {}, 6),
    xmlElement("updatedAt", asset.updatedAtFormatted || asset.updatedAt, {}, 6),
  ]))

  lines.push(renderListXml("holdings", "holding", data.portfolio.holdings, 4, (holding) => [
    xmlElement("portfolio", holding.portfolio, {}, 6),
    xmlElement("symbol", holding.symbol, {}, 6),
    xmlElement("name", holding.name, {}, 6),
    xmlElement("type", holding.type, {}, 6),
    xmlElement("quantity", holding.quantity, {}, 6),
    xmlElement("averagePurchasePrice", holding.averagePurchasePrice, { currency: holding.currency || currency }, 6),
    xmlElement("currentPrice", holding.currentPrice, { currency: holding.currency || currency }, 6),
    xmlElement("marketValue", holding.marketValue, { currency: holding.currency || currency }, 6),
  ]))

  lines.push(renderListXml("transactions", "transaction", data.portfolio.transactions, 4, (transaction) => [
    xmlElement("date", transaction.dateFormatted || transaction.date, {}, 6),
    xmlElement("type", transaction.type, {}, 6),
    xmlElement("asset", transaction.asset, {}, 6),
    xmlElement("symbol", transaction.symbol, {}, 6),
    xmlElement("quantity", transaction.quantity, {}, 6),
    xmlElement("pricePerUnit", transaction.pricePerUnit, { currency: transaction.currency || currency }, 6),
    xmlElement("amount", transaction.amount, { currency: transaction.currency || currency }, 6),
    xmlElement("fee", transaction.fee, { currency: transaction.currency || currency }, 6),
    xmlElement("account", transaction.account, {}, 6),
    xmlElement("comment", transaction.comment, {}, 6),
  ]))

  return lines
}

function renderAnalyticsXml(data: PublicExportJson, currency: string) {
  const lines = [
    renderListXml("allocation", "item", data.analytics.allocation, 4, (item) => [
      xmlElement("name", item.asset, {}, 6),
      xmlElement("value", item.value, { currency }, 6),
      xmlElement("percent", item.sharePercent, {}, 6),
    ]),
    "    <performance>",
    "      <summary>",
    xmlElement("pointsCount", data.analytics.performance.summary.pointsCount, {}, 8),
    xmlElement("lastDate", data.analytics.performance.summary.lastDateFormatted || data.analytics.performance.summary.lastDate, {}, 8),
    xmlElement("currentValue", data.analytics.performance.summary.currentValue, { currency }, 8),
    xmlElement("investedAmount", data.analytics.performance.summary.investedAmount, { currency }, 8),
    xmlElement("profitLoss", data.analytics.performance.summary.profitLoss, { currency }, 8),
    xmlElement("returnPercent", data.analytics.performance.summary.returnPercent, {}, 8),
    "      </summary>",
    "    </performance>",
  ]
  return lines
}

function renderListXml<T>(container: string, itemName: string, items: T[], indent: number, renderItem: (item: T) => string[]) {
  const pad = " ".repeat(indent)
  if (!items.length) return `${pad}<${container} />`
  return [
    `${pad}<${container}>`,
    ...items.flatMap((item) => [
      `${pad}  <${itemName}>`,
      ...renderItem(item),
      `${pad}  </${itemName}>`,
    ]),
    `${pad}</${container}>`,
  ].join("\n")
}

function xmlElement(name: string, value: unknown, attrs: Record<string, unknown> = {}, indent = 0) {
  if (value === undefined || value === null || value === "") return ""
  const attributes = Object.entries(attrs)
    .filter(([, attrValue]) => attrValue !== undefined && attrValue !== null && attrValue !== "")
    .map(([key, attrValue]) => ` ${key}="${escapeXml(attrValue)}"`)
    .join("")
  return `${" ".repeat(indent)}<${name}${attributes}>${escapeXml(value)}</${name}>`
}

export function generateWorkbookExport(bundle: ExportDataBundle, format: Extract<ExportFormat, "xlsx" | "xls" | "ods">): ExportFile {
  const workbook = XLSX.utils.book_new()
  const sections = tableSections(bundle)

  for (const section of sections) {
    const sheet = XLSX.utils.json_to_sheet(section.rows.length > 0 ? section.rows : [{ status: "No data" }])
    sheet["!cols"] = Object.keys(section.rows[0] ?? { status: "" }).map((key) => ({ wch: Math.max(12, Math.min(32, key.length + 4)) }))
    XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(section.title))
  }

  if (sections.length === 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ status: "No data" }]), "Export")
  }

  const bookType = format === "ods" ? "ods" : format === "xls" ? "biff8" : "xlsx"
  const body = XLSX.write(workbook, { type: "buffer", bookType }) as Buffer
  const contentType =
    format === "ods"
      ? "application/vnd.oasis.opendocument.spreadsheet"
      : format === "xls"
        ? "application/vnd.ms-excel"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  return buildExportFile(safeFilename(bundle.metadata.title, format), contentType, Uint8Array.from(body))
}

export function tableSections(bundle: ExportDataBundle): ExportViewSection[] {
  return mapToExportViewModel(bundle).sections
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function renderHtmlTable(title: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return `<section><h2>${escapeXml(title)}</h2><p>No data</p></section>`
  const headers = Object.keys(rows[0])
  return [
    `<section><h2>${escapeXml(title)}</h2>`,
    "<table>",
    `<thead><tr>${headers.map((header) => `<th>${escapeXml(header)}</th>`).join("")}</tr></thead>`,
    `<tbody>${rows
      .map((row) => `<tr>${headers.map((header) => `<td>${escapeXml(row[header])}</td>`).join("")}</tr>`)
      .join("")}</tbody>`,
    "</table></section>",
  ].join("")
}

function sanitizeSheetName(value: string) {
  return value.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Sheet"
}

type PublicExportJson = ReturnType<typeof buildPublicJsonExport> & {
  meta: {
    generatedAt: string
    generatedAtFormatted: string
    applicationUrl: string
    language: "ru" | "en"
    currency: string
    period: { label: string }
  }
  portfolio: {
    summary: null | {
      portfolioValue: number
      investedAmount: number
      cashBalance: number
      profitLoss: number
      returnPercent: number
      assetCount: number
      largestPosition: null | { symbol: string; name: string; sharePercent: number }
    }
    accounts: Array<{ name: string; type: string; balance: number; currency: string; createdAt: string; createdAtFormatted: string }>
    assets: Array<{ symbol: string; name: string; type: string; currentPrice: number; currency: string; updatedAt: string; updatedAtFormatted: string }>
    holdings: Array<{
      portfolio: string
      symbol: string
      name: string
      type: string
      quantity: number
      averagePurchasePrice: number
      currentPrice: number
      marketValue: number
      currency: string
    }>
    transactions: Array<{
      date: string
      dateFormatted: string
      type: string
      asset: string
      symbol: string
      quantity: number | null
      pricePerUnit: number | null
      amount: number
      fee: number
      currency: string
      account: string
      comment: string
    }>
  }
  analytics: {
    allocation: Array<{ asset: string; value: number; sharePercent: number }>
    performance: {
      summary: {
        pointsCount: number
        lastDate?: string
        lastDateFormatted?: string
        currentValue: number
        investedAmount: number
        profitLoss: number
        returnPercent: number
      }
    }
  }
}
