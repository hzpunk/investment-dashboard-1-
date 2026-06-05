export type AllocationChartData = Array<{
  label: string
  value: number
  percent: number
}>

export type PerformanceChartData = Array<{
  date: string
  value?: number
  portfolioValue?: number
  investedAmount?: number
  pnl?: number
}>

export type ExportSvgChart = {
  svg: string
  width: number
  height: number
}

const palette = ["#111827", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"]

export function generateAllocationSvgChart(data: AllocationChartData, width = 640, height = 280): ExportSvgChart | null {
  const rows = data.filter((item) => Number.isFinite(item.value) && item.value > 0).slice(0, 8)
  if (rows.length === 0) return null

  const margin = 28
  const labelWidth = 150
  const barHeight = 18
  const gap = 12
  const maxValue = Math.max(...rows.map((item) => item.value), 1)
  const plotWidth = width - margin * 2 - labelWidth
  const contentHeight = rows.length * (barHeight + gap) - gap
  const chartHeight = Math.max(height, contentHeight + margin * 2)

  const body = rows
    .map((item, index) => {
      const y = margin + index * (barHeight + gap)
      const barWidth = Math.max(2, (item.value / maxValue) * plotWidth)
      const color = palette[index % palette.length]
      return [
        `<text x="${margin}" y="${y + 13}" font-family="Arial, sans-serif" font-size="12" fill="#111827">${escapeSvg(item.label)}</text>`,
        `<rect x="${margin + labelWidth}" y="${y}" width="${barWidth.toFixed(1)}" height="${barHeight}" rx="4" fill="${color}" />`,
        `<text x="${margin + labelWidth + barWidth + 8}" y="${y + 13}" font-family="Arial, sans-serif" font-size="12" fill="#374151">${formatPercent(item.percent)}</text>`,
      ].join("")
    })
    .join("")

  return {
    width,
    height: chartHeight,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${chartHeight}" viewBox="0 0 ${width} ${chartHeight}" role="img">${body}</svg>`,
  }
}

export function generatePerformanceSvgChart(data: PerformanceChartData, width = 640, height = 280): ExportSvgChart | null {
  const points = data
    .map((point) => ({
      date: point.date,
      value: Number(point.portfolioValue ?? point.value ?? 0),
      investedAmount: Number(point.investedAmount ?? 0),
    }))
    .filter((point) => Number.isFinite(point.value))
    .slice(-90)

  if (points.length < 2) return null

  const margin = { top: 24, right: 28, bottom: 36, left: 58 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const values = points.flatMap((point) => (point.investedAmount > 0 ? [point.value, point.investedAmount] : [point.value]))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  const scaleX = (index: number) => margin.left + (index / Math.max(points.length - 1, 1)) * plotWidth
  const scaleY = (value: number) => margin.top + plotHeight - ((value - min) / range) * plotHeight
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(index).toFixed(1)},${scaleY(point.value).toFixed(1)}`).join(" ")
  const investedPath =
    points.some((point) => point.investedAmount > 0)
      ? points.map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(index).toFixed(1)},${scaleY(point.investedAmount).toFixed(1)}`).join(" ")
      : ""
  const firstLabel = formatShortDate(points[0]?.date)
  const lastLabel = formatShortDate(points.at(-1)?.date)

  return {
    width,
    height,
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`,
      `<line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#d1d5db" />`,
      `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#d1d5db" />`,
      investedPath ? `<path d="${investedPath}" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="5 4" />` : "",
      `<path d="${path}" fill="none" stroke="#111827" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />`,
      `<circle cx="${scaleX(points.length - 1).toFixed(1)}" cy="${scaleY(points.at(-1)?.value ?? 0).toFixed(1)}" r="4" fill="#111827" />`,
      `<text x="${margin.left}" y="${height - 12}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">${escapeSvg(firstLabel)}</text>`,
      `<text x="${margin.left + plotWidth - 56}" y="${height - 12}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">${escapeSvg(lastLabel)}</text>`,
      `<text x="${margin.left}" y="16" font-family="Arial, sans-serif" font-size="11" fill="#374151">Min ${formatNumber(min)} / Max ${formatNumber(max)}</text>`,
      `</svg>`,
    ].join(""),
  }
}

function escapeSvg(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "0"
}

function formatShortDate(value: string | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`
}
