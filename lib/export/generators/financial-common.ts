import { createHash } from "node:crypto"
import { buildExportFile, safeFilename } from "@/lib/export/formatters"
import type { ExportDataBundle, ExportFile, ExportFormat } from "@/lib/export/types"
import { mapToFinancialExportModel, type FinancialExportModel, type FinancialExportTransaction } from "@/lib/export/presentation/financial-view-model"

export const UTF8_BOM = "\uFEFF"

export function financialModel(bundle: ExportDataBundle): FinancialExportModel {
  return mapToFinancialExportModel(bundle)
}

export function financialFile(bundle: ExportDataBundle, extension: ExportFormat, contentType: string, body: string): ExportFile {
  return buildExportFile(safeFilename(bundle.metadata.title, extension), contentType, body)
}

export function datedFinancialFile(bundle: ExportDataBundle, extension: "sta", contentType: string, body: string): ExportFile {
  const csvLike = safeFilename(bundle.metadata.title, "csv")
  const filename = csvLike.replace(/\.csv$/, `.${extension}`)
  return buildExportFile(filename, contentType, body)
}

export function cleanLine(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function money(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return "0.00"
  return numeric.toFixed(2)
}

export function mt940Money(value: unknown) {
  return money(value).replace(".", ",")
}

export function signedAmount(transaction: FinancialExportTransaction) {
  const amount = Math.abs(Number(transaction.amount) || 0)
  return isDebit(transaction) ? -amount : amount
}

export function isDebit(transaction: FinancialExportTransaction) {
  return transaction.type === "buy" || transaction.type === "withdrawal" || transaction.type === "fee"
}

export function isoDate(value: string) {
  const date = parseDate(value)
  return date.toISOString().slice(0, 10)
}

export function qifDate(value: string) {
  const [year, month, day] = isoDate(value).split("-")
  return `${day}.${month}.${year}`
}

export function ofxDate(value: string) {
  const date = parseDate(value)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("")
}

export function mt940Date(value: string) {
  const [year, month, day] = isoDate(value).split("-")
  return `${year.slice(2)}${month}${day}`
}

export function stableId(...parts: unknown[]) {
  return createHash("sha256")
    .update(parts.map((part) => cleanLine(part)).join("|"))
    .digest("hex")
    .slice(0, 24)
}

export function transactionName(transaction: FinancialExportTransaction) {
  const asset = [transaction.symbol, transaction.assetName].filter(Boolean).join(" ")
  return cleanLine(`${transaction.typeLabel}${asset ? ` ${asset}` : ""}`)
}

export function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function parseDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}
