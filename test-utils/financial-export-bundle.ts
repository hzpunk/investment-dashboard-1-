import { sampleExportBundle } from "@/test-utils/export-bundle"
import type { ExportDataBundle } from "@/lib/export/types"

export function financialBundle(format: ExportDataBundle["metadata"]["format"] = "qif") {
  const base = sampleExportBundle()
  return sampleExportBundle({
    metadata: {
      ...base.metadata,
      format,
      language: "ru",
      selectedSections: ["accounts", "transactions", "metadata", "allocationChart", "performanceChart"],
      options: { ...base.metadata.options, language: "ru" },
    },
    accounts: [
      {
        name: "Demo & <Main> Brokerage",
        type: "brokerage",
        balance: 50000,
        currency: "USD",
        createdAt: "2026-06-04T00:00:00.000Z",
      },
    ],
    transactions: [
      {
        date: "2026-06-04T15:27:44.096Z",
        type: "buy",
        symbol: "AAPL",
        assetName: "Apple & <Inc>",
        quantity: 20,
        pricePerUnit: 175,
        totalAmount: 3500,
        fee: 1,
        currency: "USD",
        account: "Demo & <Main> Brokerage",
        notes: "Seed demo transaction",
      },
      {
        date: "2026-06-05T10:00:00.000Z",
        type: "deposit",
        symbol: "",
        assetName: "",
        quantity: null,
        pricePerUnit: null,
        totalAmount: 50000,
        fee: 0,
        currency: "USD",
        account: "Demo & <Main> Brokerage",
        notes: "Cash deposit",
      },
    ],
  })
}

export const forbiddenFinancialLeaks = [
  "assetId",
  "accountId",
  "portfolioId",
  "userId",
  "totalPortfolioValue",
  "qrCodeDataUrl",
  "projectionDefaults",
  "cmpzng1cv0003rk28vwl9a6cq",
]
