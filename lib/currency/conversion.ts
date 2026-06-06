import type { ConvertedMoney, CurrencyRate, Money, SumMoneyResult } from "@/lib/currency/types"

export function rubPerUnit(rate: Pick<CurrencyRate, "value" | "nominal">) {
  const nominal = Number(rate.nominal)
  const value = Number(rate.value)
  if (!Number.isFinite(value) || !Number.isFinite(nominal) || nominal <= 0 || value <= 0) return null
  return value / nominal
}

export function convertMoney(
  money: Money,
  targetCurrency: string,
  rates: CurrencyRate[],
  options: { stale?: boolean } = {},
): ConvertedMoney {
  const source = money.currency.toUpperCase()
  const target = targetCurrency.toUpperCase()
  const amount = Number(money.amount)

  if (!Number.isFinite(amount)) {
    return {
      original: { amount: 0, currency: source || money.currency },
      converted: { amount: 0, currency: target },
      unavailable: true,
      warning: "CURRENCY_CONVERSION_FAILED",
      error: "CONVERSION_FAILED",
    }
  }

  if (source === target) {
    return {
      original: { amount, currency: source },
      converted: { amount, currency: target },
      source: "same-currency",
      stale: options.stale,
    }
  }

  const rateByQuote = new Map(rates.map((rate) => [rate.quote.toUpperCase(), rate]))
  let rubAmount: number
  let usedRate: CurrencyRate | undefined

  if (source === "RUB") {
    rubAmount = amount
  } else {
    const sourceRate = rateByQuote.get(source)
    const sourceRubPerUnit = sourceRate ? rubPerUnit(sourceRate) : null
    if (!sourceRate || sourceRubPerUnit === null) {
      return {
        original: { amount, currency: source },
        converted: { amount: 0, currency: target },
        unavailable: true,
        warning: "CURRENCY_RATE_UNAVAILABLE",
        error: "RATE_UNAVAILABLE",
      }
    }
    usedRate = sourceRate
    rubAmount = amount * sourceRubPerUnit
  }

  if (target === "RUB") {
    return {
      original: { amount, currency: source },
      converted: { amount: rubAmount, currency: target },
      rate: usedRate ? rubPerUnit(usedRate) ?? undefined : 1,
      rateDate: usedRate?.date,
      source: usedRate ? "CBR" : "same-currency",
      stale: options.stale,
    }
  }

  const targetRate = rateByQuote.get(target)
  const targetRubPerUnit = targetRate ? rubPerUnit(targetRate) : null
  if (!targetRate || targetRubPerUnit === null) {
    return {
      original: { amount, currency: source },
      converted: { amount: 0, currency: target },
      unavailable: true,
      warning: "CURRENCY_RATE_UNAVAILABLE",
      error: "RATE_UNAVAILABLE",
    }
  }

  return {
    original: { amount, currency: source },
    converted: { amount: rubAmount / targetRubPerUnit, currency: target },
    rate: targetRubPerUnit,
    rateDate: targetRate.date,
    source: "CBR",
    stale: options.stale,
  }
}

export function convertMoneySafe(
  money: Money,
  targetCurrency: string,
  rates: CurrencyRate[] = [],
  options: { stale?: boolean } = {},
): ConvertedMoney {
  return convertMoney(money, targetCurrency, rates, options)
}

export function convertMoneyStrict(
  money: Money,
  targetCurrency: string,
  rates: CurrencyRate[] = [],
  options: { stale?: boolean } = {},
): ConvertedMoney {
  const converted = convertMoney(money, targetCurrency, rates, options)
  if (converted.error) {
    throw new Error(converted.error)
  }
  return converted
}

export function sumMoneyInCurrency(
  values: Money[],
  targetCurrency: string,
  rates: CurrencyRate[] = [],
  options: { stale?: boolean } = {},
): SumMoneyResult {
  const target = targetCurrency.toUpperCase()
  const items = values.map((money) => convertMoneySafe(money, target, rates, options))
  const failedCount = items.filter((item) => item.unavailable || item.error).length
  const convertedCount = items.filter((item) => !item.error && item.source === "CBR").length
  const totalAmount = items.reduce((sum, item) => (item.error ? sum : sum + item.converted.amount), 0)
  const successfulCount = items.length - failedCount
  const status =
    failedCount > 0 && successfulCount > 0
      ? "partial"
      : failedCount > 0
        ? "unavailable"
        : convertedCount > 0
          ? "converted"
          : "same-currency"

  return {
    total: { amount: totalAmount, currency: target },
    items,
    status,
    failedCount,
    convertedCount,
  }
}
