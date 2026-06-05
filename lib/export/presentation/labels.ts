import type { ExportSectionKey } from "@/lib/export/types"

export type ExportPresentationLocale = "ru" | "en"

export type ExportFieldKey =
  | "portfolioValue"
  | "investedAmount"
  | "cashBalance"
  | "profitLoss"
  | "returnPercent"
  | "assetCount"
  | "diversificationScore"
  | "largestPosition"
  | "name"
  | "type"
  | "balance"
  | "currency"
  | "createdAt"
  | "symbol"
  | "currentPrice"
  | "updatedAt"
  | "portfolio"
  | "quantity"
  | "averageBuyPrice"
  | "marketValue"
  | "costBasis"
  | "allocationPercent"
  | "date"
  | "transactionType"
  | "asset"
  | "pricePerUnit"
  | "totalAmount"
  | "fee"
  | "account"
  | "comment"
  | "simpleReturnPercent"
  | "cagrPercent"
  | "volatilityPercent"
  | "maxDrawdownPercent"
  | "risk"
  | "warnings"
  | "value"
  | "percent"
  | "portfolioValuePoint"
  | "investedAmountPoint"
  | "pnl"
  | "pnlPercent"
  | "status"
  | "note"
  | "action"
  | "entityType"
  | "generatedAt"
  | "period"
  | "applicationUrl"

export const EXPORT_SECTION_LABELS: Record<ExportPresentationLocale, Record<ExportSectionKey, string>> = {
  ru: {
    portfolioSummary: "Сводка портфеля",
    accounts: "Счета",
    assets: "Активы",
    holdings: "Позиции",
    transactions: "Транзакции",
    analytics: "Аналитика",
    allocationChart: "Распределение активов",
    performanceChart: "Динамика портфеля",
    calculators: "Результаты калькуляторов",
    aiSummary: "AI-сводка",
    auditLogSummary: "Журнал действий",
    metadata: "Метаданные",
  },
  en: {
    portfolioSummary: "Portfolio summary",
    accounts: "Accounts",
    assets: "Assets",
    holdings: "Holdings",
    transactions: "Transactions",
    analytics: "Analytics",
    allocationChart: "Asset allocation",
    performanceChart: "Portfolio performance",
    calculators: "Calculator results",
    aiSummary: "AI summary",
    auditLogSummary: "Audit log",
    metadata: "Metadata",
  },
}

export const EXPORT_FIELD_LABELS: Record<ExportPresentationLocale, Record<ExportFieldKey, string>> = {
  ru: {
    portfolioValue: "Стоимость портфеля",
    investedAmount: "Вложено",
    cashBalance: "Свободные средства",
    profitLoss: "Прибыль/убыток",
    returnPercent: "Доходность",
    assetCount: "Количество активов",
    diversificationScore: "Индекс диверсификации",
    largestPosition: "Крупнейшая позиция",
    name: "Название",
    type: "Тип",
    balance: "Баланс",
    currency: "Валюта",
    createdAt: "Дата создания",
    symbol: "Тикер",
    currentPrice: "Текущая цена",
    updatedAt: "Дата обновления",
    portfolio: "Портфель",
    quantity: "Количество",
    averageBuyPrice: "Средняя цена покупки",
    marketValue: "Рыночная стоимость",
    costBasis: "Стоимость покупки",
    allocationPercent: "Доля в портфеле",
    date: "Дата",
    transactionType: "Тип операции",
    asset: "Актив",
    pricePerUnit: "Цена за единицу",
    totalAmount: "Сумма",
    fee: "Комиссия",
    account: "Счёт",
    comment: "Комментарий",
    simpleReturnPercent: "Простая доходность",
    cagrPercent: "CAGR",
    volatilityPercent: "Волатильность",
    maxDrawdownPercent: "Максимальная просадка",
    risk: "Уровень риска",
    warnings: "Предупреждения",
    value: "Стоимость",
    percent: "Доля",
    portfolioValuePoint: "Стоимость портфеля",
    investedAmountPoint: "Вложено",
    pnl: "Прибыль/убыток",
    pnlPercent: "Доходность",
    status: "Статус",
    note: "Примечание",
    action: "Действие",
    entityType: "Объект",
    generatedAt: "Сформировано",
    period: "Период",
    applicationUrl: "Ссылка на приложение",
  },
  en: {
    portfolioValue: "Portfolio value",
    investedAmount: "Invested amount",
    cashBalance: "Cash balance",
    profitLoss: "Profit/Loss",
    returnPercent: "Return",
    assetCount: "Asset count",
    diversificationScore: "Diversification index",
    largestPosition: "Largest position",
    name: "Name",
    type: "Type",
    balance: "Balance",
    currency: "Currency",
    createdAt: "Created at",
    symbol: "Ticker",
    currentPrice: "Current price",
    updatedAt: "Updated at",
    portfolio: "Portfolio",
    quantity: "Quantity",
    averageBuyPrice: "Average purchase price",
    marketValue: "Market value",
    costBasis: "Cost basis",
    allocationPercent: "Portfolio share",
    date: "Date",
    transactionType: "Operation type",
    asset: "Asset",
    pricePerUnit: "Price per unit",
    totalAmount: "Amount",
    fee: "Fee",
    account: "Account",
    comment: "Comment",
    simpleReturnPercent: "Simple return",
    cagrPercent: "CAGR",
    volatilityPercent: "Volatility",
    maxDrawdownPercent: "Max drawdown",
    risk: "Risk level",
    warnings: "Warnings",
    value: "Value",
    percent: "Share",
    portfolioValuePoint: "Portfolio value",
    investedAmountPoint: "Invested amount",
    pnl: "Profit/Loss",
    pnlPercent: "Return",
    status: "Status",
    note: "Note",
    action: "Action",
    entityType: "Entity",
    generatedAt: "Generated",
    period: "Period",
    applicationUrl: "Application link",
  },
}

export function sectionLabel(key: ExportSectionKey, locale: ExportPresentationLocale) {
  return EXPORT_SECTION_LABELS[locale][key]
}

export function fieldLabel(key: ExportFieldKey, locale: ExportPresentationLocale) {
  return EXPORT_FIELD_LABELS[locale][key]
}
