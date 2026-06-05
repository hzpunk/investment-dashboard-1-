import type { ExportDataBundle, ExportFile } from "@/lib/export/types"
import {
  cleanLine,
  financialFile,
  financialModel,
  money,
  ofxDate,
  signedAmount,
  stableId,
  transactionName,
  xmlEscape,
} from "@/lib/export/generators/financial-common"

export function generateOfxExport(bundle: ExportDataBundle): ExportFile {
  const model = financialModel(bundle)
  const account = model.accounts[0]
  const currency = account?.currency || model.currency
  const accountName = account?.name || "Investment account"
  const dates = model.transactions.map((transaction) => transaction.date)
  const startDate = dates.length ? ofxDate(dates.reduce((min, date) => (date < min ? date : min), dates[0])) : ofxDate(model.generatedAt)
  const endDate = dates.length ? ofxDate(dates.reduce((max, date) => (date > max ? date : max), dates[0])) : ofxDate(model.generatedAt)
  const language = model.language === "ru" ? "RUS" : "ENG"
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<OFX>",
    "  <SIGNONMSGSRSV1>",
    "    <SONRS>",
    "      <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>",
    `      <DTSERVER>${ofxDate(model.generatedAt)}</DTSERVER>`,
    `      <LANGUAGE>${language}</LANGUAGE>`,
    "    </SONRS>",
    "  </SIGNONMSGSRSV1>",
    "  <BANKMSGSRSV1>",
    "    <STMTTRNRS>",
    `      <TRNUID>${stableId(model.title, model.generatedAt, accountName)}</TRNUID>`,
    "      <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>",
    "      <STMTRS>",
    `        <CURDEF>${xmlEscape(currency)}</CURDEF>`,
    "        <BANKACCTFROM>",
    "          <BANKID>INVESTTRACK</BANKID>",
    `          <ACCTID>${xmlEscape(accountName)}</ACCTID>`,
    "          <ACCTTYPE>INVESTMENT</ACCTTYPE>",
    "        </BANKACCTFROM>",
    "        <BANKTRANLIST>",
    `          <DTSTART>${startDate}</DTSTART>`,
    `          <DTEND>${endDate}</DTEND>`,
    ...model.transactions.flatMap((transaction) => [
      "          <STMTTRN>",
      `            <TRNTYPE>${ofxTransactionType(transaction.type)}</TRNTYPE>`,
      `            <DTPOSTED>${ofxDate(transaction.date)}</DTPOSTED>`,
      `            <TRNAMT>${money(signedAmount(transaction))}</TRNAMT>`,
      `            <FITID>${stableId(transaction.date, transaction.type, transaction.symbol, transaction.amount, transaction.account, transaction.note)}</FITID>`,
      `            <NAME>${xmlEscape(transactionName(transaction))}</NAME>`,
      transaction.note ? `            <MEMO>${xmlEscape(cleanLine(transaction.note))}</MEMO>` : "",
      "          </STMTTRN>",
    ].filter(Boolean)),
    "        </BANKTRANLIST>",
    "      </STMTRS>",
    "    </STMTTRNRS>",
    "  </BANKMSGSRSV1>",
    "</OFX>",
  ]

  return financialFile(bundle, "ofx", "application/x-ofx; charset=utf-8", lines.join("\n"))
}

function ofxTransactionType(type: string) {
  switch (type) {
    case "buy":
    case "withdrawal":
    case "fee":
      return "DEBIT"
    case "sell":
    case "dividend":
    case "interest":
    case "deposit":
      return "CREDIT"
    default:
      return "OTHER"
  }
}
