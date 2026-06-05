import type { ExportDataBundle, ExportFile } from "@/lib/export/types"
import {
  cleanLine,
  financialFile,
  financialModel,
  money,
  qifDate,
  signedAmount,
  UTF8_BOM,
} from "@/lib/export/generators/financial-common"
import type { FinancialExportTransaction } from "@/lib/export/presentation/financial-view-model"

export function generateQifExport(bundle: ExportDataBundle): ExportFile {
  const model = financialModel(bundle)
  const lines: string[] = []
  const investmentTransactions = model.transactions.filter((transaction) => transaction.symbol || transaction.quantity !== null)
  const bankTransactions = model.transactions.filter((transaction) => !investmentTransactions.includes(transaction))

  if (investmentTransactions.length > 0) {
    lines.push("!Type:Invst")
    for (const transaction of investmentTransactions) {
      lines.push(...qifInvestmentTransaction(transaction))
      lines.push("^")
    }
  }

  if (bankTransactions.length > 0 || lines.length === 0) {
    lines.push("!Type:Bank")
    for (const transaction of bankTransactions) {
      lines.push(...qifBankTransaction(transaction))
      lines.push("^")
    }
  }

  return financialFile(bundle, "qif", "application/qif; charset=utf-8", UTF8_BOM + lines.join("\n"))
}

function qifInvestmentTransaction(transaction: FinancialExportTransaction) {
  const lines = [
    `D${qifDate(transaction.date)}`,
    `N${qifInvestmentAction(transaction)}`,
    transaction.symbol ? `Y${cleanLine(transaction.symbol)}` : "",
    transaction.quantity !== null ? `Q${money(transaction.quantity)}` : "",
    transaction.pricePerUnit !== null ? `I${money(transaction.pricePerUnit)}` : "",
    `T${money(signedAmount(transaction))}`,
    transaction.fee ? `O${money(transaction.fee)}` : "",
    transaction.account ? `L${cleanLine(transaction.account)}` : "",
    transaction.note ? `M${cleanLine(transaction.note)}` : "",
  ]
  return lines.filter(Boolean)
}

function qifBankTransaction(transaction: FinancialExportTransaction) {
  const lines = [
    `D${qifDate(transaction.date)}`,
    `T${money(signedAmount(transaction))}`,
    transaction.account ? `P${cleanLine(transaction.account)}` : "",
    transaction.note ? `M${cleanLine(transaction.note)}` : "",
  ]
  return lines.filter(Boolean)
}

function qifInvestmentAction(transaction: FinancialExportTransaction) {
  switch (transaction.type) {
    case "buy":
      return "Buy"
    case "sell":
      return "Sell"
    case "dividend":
      return "Div"
    case "interest":
      return "IntInc"
    case "deposit":
      return "Dep"
    case "withdrawal":
      return "Withdraw"
    case "fee":
      return "MiscExp"
    default:
      return "Misc"
  }
}
