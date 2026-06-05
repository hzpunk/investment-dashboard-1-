import type { ExportDataBundle } from "@/lib/export/types"
import { formatAccountType, formatTransactionType } from "@/lib/export/presentation/enums"
import { sanitizeExportData } from "@/lib/export/presentation/sanitize-export-data"

export type FinancialTransactionType = "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal" | "fee" | "other"

export type FinancialExportAccount = {
  name: string
  type: string
  balance: number
  currency: string
}

export type FinancialExportTransaction = {
  date: string
  type: FinancialTransactionType
  typeLabel: string
  symbol: string
  assetName: string
  quantity: number | null
  pricePerUnit: number | null
  amount: number
  fee: number
  currency: string
  account: string
  note: string
}

export type FinancialExportModel = {
  generatedAt: string
  generatedAtFormatted: string
  language: "ru" | "en"
  currency: string
  title: string
  accounts: FinancialExportAccount[]
  transactions: FinancialExportTransaction[]
}

export function mapToFinancialExportModel(bundle: ExportDataBundle): FinancialExportModel {
  const language = bundle.metadata.language
  return sanitizeExportData({
    generatedAt: bundle.metadata.generatedAt,
    generatedAtFormatted: bundle.metadata.generatedAtFormatted,
    language,
    currency: bundle.metadata.currency,
    title: bundle.metadata.title,
    accounts: (bundle.accounts ?? []).map((account) => ({
      name: account.name,
      type: formatAccountType(account.type, language),
      balance: account.balance,
      currency: account.currency || bundle.metadata.currency,
    })),
    transactions: (bundle.transactions ?? []).map((transaction) => {
      const type = normalizeTransactionType(transaction.type)
      return {
        date: transaction.date,
        type,
        typeLabel: formatTransactionType(type, language),
        symbol: transaction.symbol,
        assetName: transaction.assetName,
        quantity: transaction.quantity,
        pricePerUnit: transaction.pricePerUnit,
        amount: transaction.totalAmount,
        fee: transaction.fee,
        currency: transaction.currency || bundle.metadata.currency,
        account: transaction.account,
        note: transaction.notes,
      }
    }),
  })
}

function normalizeTransactionType(value: unknown): FinancialTransactionType {
  const type = String(value ?? "").toLowerCase()
  if (["buy", "sell", "dividend", "interest", "deposit", "withdrawal", "fee"].includes(type)) {
    return type as FinancialTransactionType
  }
  return "other"
}
