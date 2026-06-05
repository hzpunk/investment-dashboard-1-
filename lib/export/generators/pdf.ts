import fs from "node:fs"
import path from "node:path"
import * as fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import type { ExportDataBundle, ExportFile } from "@/lib/export/types"
import { buildExportFile, safeFilename } from "@/lib/export/formatters"
import { dataUrlToBytes } from "@/lib/export/qr-code"
import { A4_LANDSCAPE, A4_PORTRAIT, validateLayout, type LayoutBlock, type LayoutPage } from "@/lib/export/layout-validator"
import { tableSections } from "@/lib/export/generators/tabular"

type PdfContext = {
  doc: PDFDocument
  page: PDFPage
  font: PDFFont
  boldFont: PDFFont
  pageLayout: LayoutPage
  pageNumber: number
  cursorY: number
  blocks: LayoutBlock[]
}

const gap = 12
export const PDF_FONT_FILES = {
  regular: path.join(process.cwd(), "assets", "fonts", "NotoSans-Regular.ttf"),
  bold: path.join(process.cwd(), "assets", "fonts", "NotoSans-Bold.ttf"),
}

export async function generatePdfExport(bundle: ExportDataBundle): Promise<ExportFile> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(resolveFontkit())

  const effectiveLayout = bundle.metadata.orientation === "landscape" ? A4_LANDSCAPE : A4_PORTRAIT
  const pageSize = [effectiveLayout.width, effectiveLayout.height] as [number, number]

  const fontState = await loadFonts(doc)
  const page = doc.addPage(pageSize as [number, number])
  const ctx: PdfContext = {
    doc,
    page,
    font: fontState.font,
    boldFont: fontState.boldFont,
    pageLayout: effectiveLayout,
    pageNumber: 1,
    cursorY: effectiveLayout.margin,
    blocks: [],
  }

  drawTitle(ctx, bundle.metadata.title, bundle.metadata.subtitle)

  if (bundle.metadata.appUrl || bundle.metadata.generatedAt) {
    const lines = [
      bundle.metadata.generatedAt ? `${pdfLabelClean(bundle, "generated")}: ${bundle.metadata.generatedAtFormatted}` : "",
      `${pdfLabelClean(bundle, "period")}: ${bundle.metadata.period.label}`,
      `${pdfLabelClean(bundle, "user")}: ${bundle.user.email}`,
      bundle.metadata.appUrl ? `${pdfLabelClean(bundle, "application")}: ${bundle.metadata.appUrl}` : "",
    ].filter(Boolean)
    drawTextBlock(ctx, "metadata", lines.join("\n"), 10)
  }

  for (const section of tableSections(bundle)) {
    if (section.kind === "summary" && section.summaryItems) {
      drawSummarySection(ctx, section.title, section.summaryItems)
    } else {
      drawTable(ctx, section.title, section.rows, bundle.metadata.selectedSections.length > 5 ? 24 : 40)
    }
  }

  drawSelectedCharts(ctx, bundle)

  if (bundle.qrCodeDataUrl) {
    await drawQrSection(ctx, bundle.qrCodeDataUrl, bundle.metadata.appUrl, pdfLabelClean(bundle, "applicationLink"))
  }

  drawDisclaimer(ctx, bundle)
  drawFooters(ctx)

  const validation = validateLayout(ctx.blocks, ctx.pageLayout)
  if (!validation.ok) {
    const error = new Error("PDF layout validation failed")
    ;(error as Error & { code?: string; details?: unknown }).code = "EXPORT_LAYOUT_FAILED"
    ;(error as Error & { code?: string; details?: unknown }).details = validation.issues
    throw error
  }

  const bytes = await doc.save()
  return buildExportFile(safeFilename(bundle.metadata.title, "pdf"), "application/pdf", bytes)
}

function drawTitle(ctx: PdfContext, title: string, subtitle: string) {
  const height = subtitle ? 54 : 38
  ensureSpace(ctx, height)
  const y = pdfY(ctx, ctx.cursorY, 24)
  ctx.page.drawText(pdfText(title), { x: ctx.pageLayout.margin, y, size: 20, font: ctx.boldFont, color: rgb(0.05, 0.05, 0.05) })
  if (subtitle) {
    ctx.page.drawText(pdfText(subtitle), {
      x: ctx.pageLayout.margin,
      y: y - 20,
      size: 10,
      font: ctx.font,
      color: rgb(0.35, 0.35, 0.35),
    })
  }
  addBlock(ctx, "title", "title", ctx.pageLayout.margin, ctx.cursorY, ctx.pageLayout.width - ctx.pageLayout.margin * 2, height)
  ctx.cursorY += height + gap
}

function drawTextBlock(ctx: PdfContext, id: string, text: string, fontSize = 10) {
  const lines = wrapText(pdfText(text), 95)
  const height = Math.max(24, lines.length * (fontSize + 4) + 8)
  ensureSpace(ctx, height)

  lines.forEach((line, index) => {
    ctx.page.drawText(line, {
      x: ctx.pageLayout.margin,
      y: pdfY(ctx, ctx.cursorY + 8 + index * (fontSize + 4), fontSize),
      size: fontSize,
      font: ctx.font,
      color: rgb(0.18, 0.18, 0.18),
    })
  })

  addBlock(ctx, id, "text", ctx.pageLayout.margin, ctx.cursorY, ctx.pageLayout.width - ctx.pageLayout.margin * 2, height)
  ctx.cursorY += height + gap
}

async function drawQrSection(ctx: PdfContext, dataUrl: string, label: string, heading: string) {
  const bytes = dataUrlToBytes(dataUrl)
  if (!bytes) return
  const qrSize = 72
  const qrGap = 12
  const textWidth = ctx.pageLayout.width - ctx.pageLayout.margin * 2 - qrSize - qrGap
  const lines = wrapText(pdfText(label), Math.max(24, Math.floor(textWidth / 5.5))).slice(0, 4)
  const height = 110
  ensureSpace(ctx, height)
  const image = await ctx.doc.embedPng(bytes)
  const topY = ctx.cursorY
  const qrX = ctx.pageLayout.width - ctx.pageLayout.margin - qrSize
  const qrTopY = topY + 20

  ctx.page.drawText(heading, {
    x: ctx.pageLayout.margin,
    y: pdfY(ctx, topY + 10, 10),
    size: 10,
    font: ctx.boldFont,
    color: rgb(0.12, 0.12, 0.12),
  })

  lines.forEach((line, index) => {
    ctx.page.drawText(line, {
      x: ctx.pageLayout.margin,
      y: pdfY(ctx, topY + 28 + index * 14, 9),
      size: 9,
      font: ctx.font,
      color: rgb(0.2, 0.2, 0.2),
    })
  })

  ctx.page.drawImage(image, {
    x: qrX,
    y: ctx.pageLayout.height - qrTopY - qrSize,
    width: qrSize,
    height: qrSize,
  })

  addBlock(ctx, "qr-heading", "text", ctx.pageLayout.margin, topY + 4, textWidth, 14)
  addBlock(ctx, "qr-label", "text", ctx.pageLayout.margin, topY + 24, textWidth, Math.max(14, lines.length * 14))
  addBlock(ctx, "qr", "qr", qrX, qrTopY, qrSize, qrSize)
  ctx.cursorY += height + gap
}

function drawSelectedCharts(ctx: PdfContext, bundle: ExportDataBundle) {
  if (bundle.metadata.selectedSections.includes("allocationChart") && bundle.allocationChart?.byAsset.length) {
    drawAllocationChart(ctx, pdfLabelClean(bundle, "allocationChart"), bundle.allocationChart.byAsset.slice(0, 8).map((item) => ({
      label: item.label,
      value: item.value,
      percent: item.percent,
    })))
  }

  if (bundle.metadata.selectedSections.includes("performanceChart") && bundle.performanceChart?.points.length) {
    drawPerformanceChart(ctx, pdfLabelClean(bundle, "performanceChart"), bundle.performanceChart.points.slice(-60).map((point) => ({
      date: point.date,
      value: point.portfolioValue,
      investedAmount: point.investedAmount,
    })))
  }
}

function drawAllocationChart(ctx: PdfContext, title: string, rows: Array<{ label: string; value: number; percent: number }>) {
  if (rows.length === 0) return
  drawTextBlock(ctx, "heading-allocation-chart", title, 12)
  const rowHeight = 18
  const height = rows.length * (rowHeight + 8) + 10
  ensureSpace(ctx, height)
  const x = ctx.pageLayout.margin
  const topY = ctx.cursorY
  const labelWidth = 110
  const barWidth = ctx.pageLayout.width - ctx.pageLayout.margin * 2 - labelWidth - 70
  const maxValue = Math.max(...rows.map((row) => Number(row.value) || 0), 1)

  rows.forEach((row, index) => {
    const y = topY + 8 + index * (rowHeight + 8)
    const width = Math.max(2, (Number(row.value) / maxValue) * barWidth)
    ctx.page.drawText(truncate(pdfText(row.label), 22), {
      x,
      y: pdfY(ctx, y + 4, 8),
      size: 8,
      font: ctx.font,
      color: rgb(0.18, 0.18, 0.18),
    })
    ctx.page.drawRectangle({
      x: x + labelWidth,
      y: ctx.pageLayout.height - y - rowHeight,
      width,
      height: rowHeight,
      color: rgb(0.12 + index * 0.03, 0.14 + index * 0.03, 0.17 + index * 0.03),
    })
    ctx.page.drawText(`${formatPercent(row.percent)}`, {
      x: x + labelWidth + barWidth + 8,
      y: pdfY(ctx, y + 4, 8),
      size: 8,
      font: ctx.font,
      color: rgb(0.25, 0.25, 0.25),
    })
  })

  addBlock(ctx, "allocation-chart", "chart", x, topY, ctx.pageLayout.width - ctx.pageLayout.margin * 2, height)
  ctx.cursorY += height + gap
}

function drawPerformanceChart(ctx: PdfContext, title: string, points: Array<{ date: string; value: number; investedAmount?: number }>) {
  if (points.length < 2) return
  drawTextBlock(ctx, "heading-performance-chart", title, 12)
  const width = ctx.pageLayout.width - ctx.pageLayout.margin * 2
  const height = 160
  ensureSpace(ctx, height)
  const topY = ctx.cursorY
  const plot = { x: ctx.pageLayout.margin + 36, y: topY + 16, width: width - 58, height: height - 44 }
  const values = points.flatMap((point) => (point.investedAmount ? [point.value, point.investedAmount] : [point.value])).filter(Number.isFinite)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const mapX = (index: number) => plot.x + (index / Math.max(points.length - 1, 1)) * plot.width
  const mapY = (value: number) => plot.y + plot.height - ((value - min) / range) * plot.height

  ctx.page.drawLine({
    start: { x: plot.x, y: ctx.pageLayout.height - (plot.y + plot.height) },
    end: { x: plot.x + plot.width, y: ctx.pageLayout.height - (plot.y + plot.height) },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
  })
  ctx.page.drawLine({
    start: { x: plot.x, y: ctx.pageLayout.height - plot.y },
    end: { x: plot.x, y: ctx.pageLayout.height - (plot.y + plot.height) },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
  })

  drawLinePath(ctx, points.map((point, index) => ({ x: mapX(index), y: mapY(point.value) })), rgb(0.07, 0.08, 0.1), 2)
  if (points.some((point) => Number(point.investedAmount) > 0)) {
    drawLinePath(ctx, points.map((point, index) => ({ x: mapX(index), y: mapY(point.investedAmount ?? 0) })), rgb(0.58, 0.6, 0.64), 1)
  }

  ctx.page.drawText(`Min ${Math.round(min)} / Max ${Math.round(max)}`, {
    x: plot.x,
    y: pdfY(ctx, topY + 6, 8),
    size: 8,
    font: ctx.font,
    color: rgb(0.3, 0.3, 0.3),
  })

  addBlock(ctx, "performance-chart", "chart", ctx.pageLayout.margin, topY, width, height)
  ctx.cursorY += height + gap
}

function drawLinePath(ctx: PdfContext, points: Array<{ x: number; y: number }>, color: ReturnType<typeof rgb>, thickness: number) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    ctx.page.drawLine({
      start: { x: previous.x, y: ctx.pageLayout.height - previous.y },
      end: { x: current.x, y: ctx.pageLayout.height - current.y },
      thickness,
      color,
    })
  }
}

function drawDisclaimer(ctx: PdfContext, bundle: ExportDataBundle) {
  drawTextBlock(ctx, "disclaimer", pdfLabelClean(bundle, "disclaimer"), 10)
}

function drawSummarySection(ctx: PdfContext, title: string, items: Array<{ label: string; value: string }>) {
  drawTextBlock(ctx, `heading-${title}`, title, 12)
  const lineHeight = 17
  const height = Math.max(28, items.length * lineHeight + 8)
  ensureSpace(ctx, height)
  const topY = ctx.cursorY
  const labelWidth = 180

  items.forEach((item, index) => {
    const y = topY + 6 + index * lineHeight
    ctx.page.drawText(pdfText(`${item.label}:`), {
      x: ctx.pageLayout.margin,
      y: pdfY(ctx, y, 9),
      size: 9,
      font: ctx.boldFont,
      color: rgb(0.12, 0.12, 0.12),
    })
    ctx.page.drawText(pdfText(item.value), {
      x: ctx.pageLayout.margin + labelWidth,
      y: pdfY(ctx, y, 9),
      size: 9,
      font: ctx.font,
      color: rgb(0.22, 0.22, 0.22),
    })
  })

  addBlock(ctx, `summary-${title}`, "text", ctx.pageLayout.margin, topY, ctx.pageLayout.width - ctx.pageLayout.margin * 2, height)
  ctx.cursorY += height + gap
}

function drawTable(ctx: PdfContext, title: string, rows: Record<string, unknown>[], maxRows: number) {
  drawTextBlock(ctx, `heading-${title}`, title, 12)
  if (rows.length === 0) {
    drawTextBlock(ctx, `empty-${title}`, "No data", 10)
    return
  }

  const headers = Object.keys(rows[0]).slice(0, 5)
  const rowHeight = 18
  const tableWidth = ctx.pageLayout.width - ctx.pageLayout.margin * 2
  const colWidth = tableWidth / headers.length
  let rendered = 0

  const renderHeader = () => {
    ensureSpace(ctx, rowHeight * 2)
    const yTop = ctx.cursorY
    headers.forEach((header, index) => {
      ctx.page.drawText(pdfText(header), {
        x: ctx.pageLayout.margin + index * colWidth + 4,
        y: pdfY(ctx, yTop + 5, 9),
        size: 8,
        font: ctx.boldFont,
        color: rgb(0.1, 0.1, 0.1),
      })
    })
    addBlock(ctx, `table-header-${title}-${rendered}`, "table", ctx.pageLayout.margin, yTop, tableWidth, rowHeight)
    ctx.cursorY += rowHeight
  }

  renderHeader()
  for (const row of rows.slice(0, maxRows)) {
    ensureSpace(ctx, rowHeight)
    if (ctx.cursorY === ctx.pageLayout.margin) renderHeader()
    const yTop = ctx.cursorY
    headers.forEach((header, index) => {
      const value = truncate(pdfText(row[header]), 24)
      ctx.page.drawText(value, {
        x: ctx.pageLayout.margin + index * colWidth + 4,
        y: pdfY(ctx, yTop + 5, 9),
        size: 8,
        font: ctx.font,
        color: rgb(0.22, 0.22, 0.22),
      })
    })
    addBlock(ctx, `table-row-${title}-${rendered}`, "table", ctx.pageLayout.margin, yTop, tableWidth, rowHeight)
    ctx.cursorY += rowHeight
    rendered += 1
  }

  if (rows.length > maxRows) {
    drawTextBlock(ctx, `table-more-${title}`, `Only first ${maxRows} rows are shown in PDF table preview. Full data is available in XLSX/JSON export.`, 9)
  } else {
    ctx.cursorY += gap
  }
}

function ensureSpace(ctx: PdfContext, height: number) {
  const maxY = ctx.pageLayout.height - ctx.pageLayout.margin - ctx.pageLayout.footerHeight
  if (ctx.cursorY + height <= maxY) return
  ctx.page = ctx.doc.addPage([ctx.pageLayout.width, ctx.pageLayout.height])
  ctx.pageNumber += 1
  ctx.cursorY = ctx.pageLayout.margin
}

function drawFooters(ctx: PdfContext) {
  const pages = ctx.doc.getPages()
  pages.forEach((page, index) => {
    const text = `InvestTrack export | Page ${index + 1} / ${pages.length}`
    page.drawText(pdfText(text), {
      x: ctx.pageLayout.margin,
      y: ctx.pageLayout.margin / 2,
      size: 8,
      font: ctx.font,
      color: rgb(0.45, 0.45, 0.45),
    })
    ctx.blocks.push({
      id: `footer-${index + 1}`,
      type: "footer",
      page: index + 1,
      x: ctx.pageLayout.margin,
      y: ctx.pageLayout.height - ctx.pageLayout.margin / 2 - 10,
      width: ctx.pageLayout.width - ctx.pageLayout.margin * 2,
      height: 10,
    })
  })
}

function addBlock(ctx: PdfContext, id: string, type: LayoutBlock["type"], x: number, y: number, width: number, height: number) {
  ctx.blocks.push({ id: `${id}-${ctx.pageNumber}`, type, page: ctx.pageNumber, x, y, width, height })
}

function pdfY(ctx: PdfContext, topY: number, fontSize: number) {
  return ctx.pageLayout.height - topY - fontSize
}

async function loadFonts(doc: PDFDocument) {
  try {
    if (!fs.existsSync(PDF_FONT_FILES.regular) || !fs.existsSync(PDF_FONT_FILES.bold)) {
      throw new Error("Noto Sans font assets are missing")
    }

    return {
      font: await doc.embedFont(Uint8Array.from(fs.readFileSync(PDF_FONT_FILES.regular))),
      boldFont: await doc.embedFont(Uint8Array.from(fs.readFileSync(PDF_FONT_FILES.bold))),
    }
  } catch (error) {
    console.error("[Export] Font load failed", error)
    throw pdfExportError("EXPORT_FONT_FAILED", "Failed to load document font.", {
      regular: path.relative(process.cwd(), PDF_FONT_FILES.regular),
      bold: path.relative(process.cwd(), PDF_FONT_FILES.bold),
      reason: error instanceof Error ? error.message : "Unknown font loading error",
    })
  }
}

function pdfExportError(code: string, message: string, details?: unknown) {
  const error = new Error(message)
  ;(error as Error & { code?: string; details?: unknown }).code = code
  ;(error as Error & { code?: string; details?: unknown }).details = details
  return error
}

function resolveFontkit() {
  return ((fontkit as typeof fontkit & { default?: typeof fontkit }).default ?? fontkit) as typeof fontkit
}

function pdfText(value: unknown) {
  return String(value ?? "")
}

function wrapText(text: string, maxLength: number) {
  return text.split("\n").flatMap((line) => {
    const words = line.split(/\s+/)
    const lines: string[] = []
    let current = ""
    for (const word of words) {
      if ((current + " " + word).trim().length > maxLength) {
        if (current) lines.push(current)
        current = word
      } else {
        current = `${current} ${word}`.trim()
      }
    }
    if (current) lines.push(current)
    return lines.length > 0 ? lines : [""]
  })
}

function truncate(value: unknown, maxLength: number) {
  const text = String(value ?? "")
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}...` : text
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`
}

function pdfLabelClean(
  bundle: ExportDataBundle,
  key: "generated" | "period" | "user" | "application" | "applicationLink" | "allocationChart" | "performanceChart" | "disclaimer",
) {
  const ru = bundle.metadata.language === "ru"
  const labels = {
    generated: ru ? "Сформировано" : "Generated",
    period: ru ? "Период" : "Period",
    user: ru ? "Пользователь" : "User",
    application: ru ? "Приложение" : "Application",
    applicationLink: ru ? "Ссылка на приложение" : "Application link",
    allocationChart: ru ? "Распределение активов" : "Asset allocation",
    performanceChart: ru ? "Динамика портфеля" : "Portfolio performance",
    disclaimer: ru
      ? "Расчёты носят справочный характер и не являются финансовой, инвестиционной или налоговой рекомендацией."
      : "Disclaimer: Calculations are approximate and are not investment, financial, or tax advice.",
  }
  return labels[key]
}

function pdfLabel(bundle: ExportDataBundle, key: "generated" | "period" | "user" | "application" | "applicationLink" | "allocationChart" | "performanceChart" | "disclaimer") {
  const ru = bundle.metadata.language === "ru"
  const labels = {
    generated: ru ? "Сформировано" : "Generated",
    period: ru ? "Период" : "Period",
    user: ru ? "Пользователь" : "User",
    application: ru ? "Приложение" : "Application",
    applicationLink: ru ? "Ссылка на приложение" : "Application link",
    allocationChart: ru ? "Диаграмма аллокации" : "Allocation chart",
    performanceChart: ru ? "График доходности" : "Performance chart",
    disclaimer: ru
      ? "Расчёты носят справочный характер и не являются финансовой, инвестиционной или налоговой рекомендацией."
      : "Disclaimer: Calculations are approximate and are not investment, financial, or tax advice.",
  }
  return labels[key]
}
