export type DateFormatLocale = "ru" | "en"

export function formatDate(value: Date | string | number | null | undefined, locale: DateFormatLocale = "ru") {
  const parts = readUtcParts(value)
  if (!parts) return ""

  const day = pad(parts.day)
  const month = pad(parts.month)
  const year = String(parts.year)
  return locale === "en" ? `${month}.${day}.${year}` : `${day}.${month}.${year}`
}

export function formatDateTime(value: Date | string | number | null | undefined, locale: DateFormatLocale = "ru") {
  const date = formatDate(value, locale)
  const parts = readUtcParts(value)
  if (!date || !parts) return ""

  return `${date} ${pad(parts.hours)}:${pad(parts.minutes)}`
}

export function formatDateForFileName(value: Date | string | number | null | undefined = new Date()) {
  const parts = readUtcParts(value)
  if (!parts) return "date"

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function readUtcParts(value: Date | string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hours: date.getUTCHours(),
    minutes: date.getUTCMinutes(),
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}
