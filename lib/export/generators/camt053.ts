import type { ExportDataBundle, ExportFile } from "@/lib/export/types"
import {
  financialFile,
  financialModel,
  isDebit,
  isoDate,
  money,
  stableId,
  transactionName,
  xmlEscape,
} from "@/lib/export/generators/financial-common"

export function generateCamt053Export(bundle: ExportDataBundle): ExportFile {
  const model = financialModel(bundle)
  const account = model.accounts[0]
  const accountName = account?.name || "Investment account"
  const currency = account?.currency || model.currency
  const messageId = `INVESTTRACK-${isoDate(model.generatedAt).replaceAll("-", "")}-${stableId(model.title, model.generatedAt).slice(0, 8)}`
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">',
    "  <BkToCstmrStmt>",
    "    <GrpHdr>",
    `      <MsgId>${xmlEscape(messageId)}</MsgId>`,
    `      <CreDtTm>${xmlEscape(new Date(model.generatedAt).toISOString())}</CreDtTm>`,
    "    </GrpHdr>",
    "    <Stmt>",
    `      <Id>${xmlEscape(stableId(accountName, model.generatedAt))}</Id>`,
    "      <ElctrncSeqNb>1</ElctrncSeqNb>",
    `      <CreDtTm>${xmlEscape(new Date(model.generatedAt).toISOString())}</CreDtTm>`,
    "      <Acct>",
    "        <Id><Othr>",
    `          <Id>${xmlEscape(accountName)}</Id>`,
    "        </Othr></Id>",
    `        <Ccy>${xmlEscape(currency)}</Ccy>`,
    "      </Acct>",
    ...model.transactions.flatMap((transaction) => [
      "      <Ntry>",
      `        <Amt Ccy="${xmlEscape(transaction.currency || currency)}">${money(Math.abs(Number(transaction.amount) || 0))}</Amt>`,
      `        <CdtDbtInd>${isDebit(transaction) ? "DBIT" : "CRDT"}</CdtDbtInd>`,
      "        <BookgDt>",
      `          <Dt>${isoDate(transaction.date)}</Dt>`,
      "        </BookgDt>",
      "        <ValDt>",
      `          <Dt>${isoDate(transaction.date)}</Dt>`,
      "        </ValDt>",
      "        <NtryDtls>",
      "          <TxDtls>",
      "            <Refs>",
      `              <EndToEndId>${stableId(transaction.date, transaction.type, transaction.symbol, transaction.amount, transaction.account, transaction.note)}</EndToEndId>`,
      "            </Refs>",
      "            <RmtInf>",
      `              <Ustrd>${xmlEscape(transactionName(transaction))}</Ustrd>`,
      "            </RmtInf>",
      "          </TxDtls>",
      "        </NtryDtls>",
      "      </Ntry>",
    ]),
    "    </Stmt>",
    "  </BkToCstmrStmt>",
    "</Document>",
  ]

  return financialFile(bundle, "xml", "application/xml; charset=utf-8", lines.join("\n"))
}
