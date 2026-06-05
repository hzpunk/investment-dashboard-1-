import { formatDate, formatDateTime } from "@/lib/format/date"
import type { ExportPresentationLocale } from "@/lib/export/presentation/labels"

export function formatExportCurrency(value: unknown, currency = "USD", locale: ExportPresentationLocale = "ru") {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ""
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatExportPercent(value: unknown, locale: ExportPresentationLocale = "ru") {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ""
  const formatted = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(numeric)
  return locale === "ru" ? `${formatted} %` : `${formatted}%`
}

export function formatExportNumber(value: unknown, locale: ExportPresentationLocale = "ru", digits = 2) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ""
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: digits,
  }).format(numeric)
}

export function formatExportDate(value: unknown, locale: ExportPresentationLocale = "ru") {
  return typeof value === "string" || value instanceof Date ? formatDate(value, locale) : ""
}

export function formatExportDateTime(value: unknown, locale: ExportPresentationLocale = "ru") {
  return typeof value === "string" || value instanceof Date ? formatDateTime(value, locale) : ""
}
