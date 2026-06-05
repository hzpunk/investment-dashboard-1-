import type { ExportDataBundle, ExportFile } from "@/lib/export/types"
import {
  cleanLine,
  datedFinancialFile,
  financialModel,
  isDebit,
  mt940Date,
  mt940Money,
  stableId,
  transactionName,
} from "@/lib/export/generators/financial-common"

export function generateMt940Export(bundle: ExportDataBundle): ExportFile {
  const model = financialModel(bundle)
  const account = model.accounts[0]
  const accountName = cleanLine(account?.name || "Investment account")
  const currency = account?.currency || model.currency
  const balance = Number(account?.balance ?? 0)
  const generated = mt940Date(model.generatedAt)
  const openingDate = model.transactions[0] ? mt940Date(model.transactions[0].date) : generated
  const reference = `INVESTTRACK${generated}`
  const lines = [
    `:20:${reference.slice(0, 16)}`,
    `:25:INVESTTRACK/${accountName}`,
    ":28C:00001/001",
    `:60F:C${openingDate}${currency}${mt940Money(balance)}`,
    ...model.transactions.flatMap((transaction) => {
      const dc = isDebit(transaction) ? "D" : "C"
      const amount = mt940Money(Math.abs(Number(transaction.amount) || 0))
      const date = mt940Date(transaction.date)
      const referenceId = stableId(transaction.date, transaction.type, transaction.symbol, transaction.amount).slice(0, 16).toUpperCase()
      return [
        `:61:${date}${date}${dc}${amount}NMSC${referenceId}//${cleanLine(transaction.symbol || "NONREF").slice(0, 16)}`,
        `:86:${transactionName(transaction)}`,
      ]
    }),
    `:62F:C${generated}${currency}${mt940Money(balance)}`,
    "-",
  ]

  return datedFinancialFile(bundle, "sta", "text/plain; charset=utf-8", lines.join("\n"))
}
