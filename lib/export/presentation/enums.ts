import type { ExportPresentationLocale } from "@/lib/export/presentation/labels"

const enumLabels = {
  ru: {
    assetTypes: {
      stock: "Акция",
      crypto: "Криптовалюта",
      etf: "ETF",
      bond: "Облигация",
      commodity: "Товарный актив",
      other: "Другое",
    },
    accountTypes: {
      brokerage: "Брокерский счёт",
      bank: "Банковский счёт",
      crypto: "Криптосчёт",
      retirement: "Пенсионный счёт",
      other: "Другое",
    },
    transactionTypes: {
      buy: "Покупка",
      sell: "Продажа",
      dividend: "Дивиденд",
      interest: "Процентный доход",
      deposit: "Пополнение",
      withdrawal: "Вывод",
    },
    risk: {
      high: "Высокий",
      medium: "Средний",
      low: "Низкий",
    },
  },
  en: {
    assetTypes: {
      stock: "Stock",
      crypto: "Cryptocurrency",
      etf: "ETF",
      bond: "Bond",
      commodity: "Commodity",
      other: "Other",
    },
    accountTypes: {
      brokerage: "Brokerage account",
      bank: "Bank account",
      crypto: "Crypto account",
      retirement: "Retirement account",
      other: "Other",
    },
    transactionTypes: {
      buy: "Buy",
      sell: "Sell",
      dividend: "Dividend",
      interest: "Interest",
      deposit: "Deposit",
      withdrawal: "Withdrawal",
    },
    risk: {
      high: "High",
      medium: "Medium",
      low: "Low",
    },
  },
} as const

export function formatAssetType(value: unknown, locale: ExportPresentationLocale) {
  return labelFromMap(value, enumLabels[locale].assetTypes)
}

export function formatAccountType(value: unknown, locale: ExportPresentationLocale) {
  return labelFromMap(value, enumLabels[locale].accountTypes)
}

export function formatTransactionType(value: unknown, locale: ExportPresentationLocale) {
  return labelFromMap(value, enumLabels[locale].transactionTypes)
}

export function formatRisk(value: unknown, locale: ExportPresentationLocale) {
  return labelFromMap(value, enumLabels[locale].risk)
}

function labelFromMap<T extends Record<string, string>>(value: unknown, map: T) {
  const key = String(value ?? "").toLowerCase()
  return map[key as keyof T] ?? String(value ?? "")
}
