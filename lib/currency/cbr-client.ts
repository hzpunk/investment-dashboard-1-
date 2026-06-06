import "server-only"

import type { CurrencyRate, CurrencyRatesResult } from "@/lib/currency/types"

const CBR_DAILY_URL = "https://www.cbr.ru/scripts/XML_daily.asp"

export function formatCbrDate(date = new Date()) {
  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const year = String(date.getUTCFullYear())
  return `${day}/${month}/${year}`
}

export function parseCbrDailyXml(xml: string): CurrencyRatesResult {
  const dateMatch = xml.match(/<ValCurs[^>]*Date="([^"]+)"/i)
  const date = dateMatch?.[1] ?? new Date().toISOString().slice(0, 10)
  const rates: CurrencyRate[] = []
  const itemRegex = /<Valute\b[^>]*>([\s\S]*?)<\/Valute>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const quote = readTag(block, "CharCode")?.toUpperCase()
    const nominal = parseCbrNumber(readTag(block, "Nominal"))
    const value = parseCbrNumber(readTag(block, "Value"))
    if (!quote || nominal === null || value === null) continue
    rates.push({ base: "RUB", quote, nominal, value, date, source: "CBR" })
  }

  return { date, rates, source: "CBR", stale: false }
}

export async function fetchCbrDailyRates(date = new Date()): Promise<CurrencyRatesResult> {
  const url = `${CBR_DAILY_URL}?date_req=${encodeURIComponent(formatCbrDate(date))}`
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`CBR rates request failed with status ${response.status}`)
  }

  const xml = await response.text()
  return parseCbrDailyXml(xml)
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match?.[1]?.trim() ?? null
}

function parseCbrNumber(value: string | null) {
  if (!value) return null
  const parsed = Number.parseFloat(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

