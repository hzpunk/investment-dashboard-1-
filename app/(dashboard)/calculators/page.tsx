"use client"

import { useMemo, useState } from "react"
import { Calculator, RotateCcw, Search } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/contexts/i18n-context"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { formatMoney } from "@/lib/currency/formatting"
import {
  calculateAllocationPercentage,
  calculateAveragePurchasePrice,
  calculateBreakEvenPoint,
  calculateBreakEvenPrice,
  calculateCagrPercent,
  calculateCompoundInterest,
  calculateDifferentiatedLoan,
  calculateDividendIncome,
  calculateFutureValueWithContributions,
  calculateInvestmentProfitTax,
  calculateLoanOverpayment,
  calculateMarginAndMarkup,
  calculateMonthlyContributionForTarget,
  calculateMortgageAnnuityPayment,
  calculatePaybackPeriodMonths,
  calculatePositionValue,
  calculateProfitLoss,
  calculateRebalancingAmount,
  calculateRevenueProfit,
  calculateRiskPositionSize,
  calculateRoiPercent,
  calculateSimpleReturnPercent,
  calculateVatAdd,
  calculateVatExtract,
} from "@/lib/finance"

type CalculatorCategory = "investment" | "assets" | "business" | "loans" | "taxes"
type ResultKind = "money" | "percent" | "number" | "months" | "text"

type CalculatorInput = {
  key: string
  labelKey: string
  defaultValue: number
  step?: string
}

type CalculatorResult = {
  labelKey: string
  value: number | string | null
  kind?: ResultKind
  tone?: "default" | "positive" | "negative"
}

type CalculatorDefinition = {
  id: string
  category: CalculatorCategory
  inputs: CalculatorInput[]
  compute: (values: Record<string, number>) => CalculatorResult[]
}

const categories: CalculatorCategory[] = ["investment", "assets", "business", "loans", "taxes"]

const calculatorDefinitions: CalculatorDefinition[] = [
  {
    id: "compoundInterest",
    category: "investment",
    inputs: [
      { key: "principal", labelKey: "calculators.inputs.principal", defaultValue: 10000 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 8, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 60 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.futureValue", value: calculateCompoundInterest(v.principal, v.annualRate, v.months), kind: "money" }],
  },
  {
    id: "futureValueContributions",
    category: "investment",
    inputs: [
      { key: "principal", labelKey: "calculators.inputs.principal", defaultValue: 10000 },
      { key: "monthlyContribution", labelKey: "calculators.inputs.monthlyContribution", defaultValue: 500 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 8, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 120 },
    ],
    compute: (v) => [
      {
        labelKey: "calculators.results.futureValue",
        value: calculateFutureValueWithContributions(v.principal, v.monthlyContribution, v.annualRate, v.months),
        kind: "money",
      },
    ],
  },
  {
    id: "goal",
    category: "investment",
    inputs: [
      { key: "target", labelKey: "calculators.inputs.targetAmount", defaultValue: 100000 },
      { key: "principal", labelKey: "calculators.inputs.currentCapital", defaultValue: 15000 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 7, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 120 },
    ],
    compute: (v) => [
      {
        labelKey: "calculators.results.monthlyRequired",
        value: calculateMonthlyContributionForTarget(v.target, v.principal, v.annualRate, v.months),
        kind: "money",
      },
    ],
  },
  {
    id: "cagr",
    category: "investment",
    inputs: [
      { key: "initial", labelKey: "calculators.inputs.initialValue", defaultValue: 10000 },
      { key: "final", labelKey: "calculators.inputs.finalValue", defaultValue: 16000 },
      { key: "years", labelKey: "calculators.inputs.years", defaultValue: 5, step: "0.1" },
    ],
    compute: (v) => [
      { labelKey: "calculators.results.cagr", value: calculateCagrPercent(v.initial, v.final, v.years), kind: "percent" },
      { labelKey: "calculators.results.simpleReturn", value: calculateSimpleReturnPercent(v.initial, v.final), kind: "percent" },
    ],
  },
  {
    id: "averagePurchasePrice",
    category: "investment",
    inputs: [
      { key: "quantity", labelKey: "calculators.inputs.currentQuantity", defaultValue: 10, step: "0.000001" },
      { key: "averagePrice", labelKey: "calculators.inputs.averagePrice", defaultValue: 100 },
      { key: "additionalQuantity", labelKey: "calculators.inputs.additionalQuantity", defaultValue: 5, step: "0.000001" },
      { key: "additionalPrice", labelKey: "calculators.inputs.additionalPrice", defaultValue: 80 },
    ],
    compute: (v) => [
      {
        labelKey: "calculators.results.averagePrice",
        value: calculateAveragePurchasePrice(v.quantity, v.averagePrice, v.additionalQuantity, v.additionalPrice),
        kind: "money",
      },
    ],
  },
  {
    id: "profitLoss",
    category: "investment",
    inputs: [
      { key: "quantity", labelKey: "calculators.inputs.quantity", defaultValue: 10, step: "0.000001" },
      { key: "buyPrice", labelKey: "calculators.inputs.buyPrice", defaultValue: 100 },
      { key: "sellPrice", labelKey: "calculators.inputs.sellPrice", defaultValue: 125 },
      { key: "fees", labelKey: "calculators.inputs.fees", defaultValue: 5 },
    ],
    compute: (v) => {
      const result = calculateProfitLoss(v.quantity, v.buyPrice, v.sellPrice, v.fees)
      return [
        { labelKey: "calculators.results.pnl", value: result.pnl, kind: "money", tone: result.pnl >= 0 ? "positive" : "negative" },
        { labelKey: "calculators.results.pnlPercent", value: result.pnlPercent, kind: "percent", tone: result.pnl >= 0 ? "positive" : "negative" },
      ]
    },
  },
  {
    id: "dividendIncome",
    category: "investment",
    inputs: [
      { key: "shares", labelKey: "calculators.inputs.shares", defaultValue: 100, step: "0.000001" },
      { key: "dividend", labelKey: "calculators.inputs.dividendPerShare", defaultValue: 2 },
      { key: "taxRate", labelKey: "calculators.inputs.taxRate", defaultValue: 13, step: "0.1" },
      { key: "payments", labelKey: "calculators.inputs.paymentsPerYear", defaultValue: 4 },
    ],
    compute: (v) => {
      const result = calculateDividendIncome(v.shares, v.dividend, v.taxRate, v.payments)
      return [
        { labelKey: "calculators.results.grossIncome", value: result.gross, kind: "money" },
        { labelKey: "calculators.results.netIncome", value: result.net, kind: "money" },
      ]
    },
  },
  {
    id: "rebalancing",
    category: "investment",
    inputs: [
      { key: "currentValue", labelKey: "calculators.inputs.currentValue", defaultValue: 25000 },
      { key: "targetPercent", labelKey: "calculators.inputs.targetPercent", defaultValue: 20, step: "0.1" },
      { key: "totalValue", labelKey: "calculators.inputs.totalPortfolioValue", defaultValue: 100000 },
    ],
    compute: (v) => {
      const result = calculateRebalancingAmount(v.currentValue, v.targetPercent, v.totalValue)
      return [
        { labelKey: "calculators.results.targetValue", value: result.targetValue, kind: "money" },
        { labelKey: "calculators.results.rebalanceDifference", value: result.difference, kind: "money" },
        { labelKey: "calculators.results.action", value: `calculators.action.${result.action}`, kind: "text" },
      ]
    },
  },
  {
    id: "positionValue",
    category: "assets",
    inputs: [
      { key: "quantity", labelKey: "calculators.inputs.quantity", defaultValue: 12, step: "0.000001" },
      { key: "price", labelKey: "calculators.inputs.price", defaultValue: 150 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.positionValue", value: calculatePositionValue(v.quantity, v.price), kind: "money" }],
  },
  {
    id: "averageAfterPurchase",
    category: "assets",
    inputs: [
      { key: "quantity", labelKey: "calculators.inputs.currentQuantity", defaultValue: 20, step: "0.000001" },
      { key: "averagePrice", labelKey: "calculators.inputs.averagePrice", defaultValue: 90 },
      { key: "additionalQuantity", labelKey: "calculators.inputs.additionalQuantity", defaultValue: 10, step: "0.000001" },
      { key: "additionalPrice", labelKey: "calculators.inputs.additionalPrice", defaultValue: 120 },
    ],
    compute: (v) => [
      {
        labelKey: "calculators.results.averagePrice",
        value: calculateAveragePurchasePrice(v.quantity, v.averagePrice, v.additionalQuantity, v.additionalPrice),
        kind: "money",
      },
    ],
  },
  {
    id: "breakEvenPrice",
    category: "assets",
    inputs: [
      { key: "quantity", labelKey: "calculators.inputs.quantity", defaultValue: 10, step: "0.000001" },
      { key: "buyPrice", labelKey: "calculators.inputs.buyPrice", defaultValue: 100 },
      { key: "fees", labelKey: "calculators.inputs.fees", defaultValue: 10 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.breakEvenPrice", value: calculateBreakEvenPrice(v.quantity, v.buyPrice, v.fees), kind: "money" }],
  },
  {
    id: "allocationPercentage",
    category: "assets",
    inputs: [
      { key: "positionValue", labelKey: "calculators.inputs.positionValue", defaultValue: 15000 },
      { key: "totalValue", labelKey: "calculators.inputs.totalPortfolioValue", defaultValue: 100000 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.allocationPercent", value: calculateAllocationPercentage(v.positionValue, v.totalValue), kind: "percent" }],
  },
  {
    id: "riskPositionSize",
    category: "assets",
    inputs: [
      { key: "accountSize", labelKey: "calculators.inputs.accountSize", defaultValue: 10000 },
      { key: "riskPercent", labelKey: "calculators.inputs.riskPercent", defaultValue: 1, step: "0.1" },
      { key: "entryPrice", labelKey: "calculators.inputs.entryPrice", defaultValue: 50 },
      { key: "stopLoss", labelKey: "calculators.inputs.stopLoss", defaultValue: 45 },
    ],
    compute: (v) => {
      const result = calculateRiskPositionSize(v.accountSize, v.riskPercent, v.entryPrice, v.stopLoss)
      return [
        { labelKey: "calculators.results.riskAmount", value: result.riskAmount, kind: "money" },
        { labelKey: "calculators.results.quantity", value: result.quantity, kind: "number" },
        { labelKey: "calculators.results.positionValue", value: result.positionValue, kind: "money" },
      ]
    },
  },
  {
    id: "vat",
    category: "business",
    inputs: [
      { key: "amount", labelKey: "calculators.inputs.amount", defaultValue: 10000 },
      { key: "vatRate", labelKey: "calculators.inputs.vatRate", defaultValue: 20, step: "0.1" },
    ],
    compute: (v) => {
      const added = calculateVatAdd(v.amount, v.vatRate)
      const extracted = calculateVatExtract(v.amount, v.vatRate)
      return [
        { labelKey: "calculators.results.vatAddedTotal", value: added.total, kind: "money" },
        { labelKey: "calculators.results.vatAddedAmount", value: added.vat, kind: "money" },
        { labelKey: "calculators.results.vatExtractedBase", value: extracted.base, kind: "money" },
        { labelKey: "calculators.results.vatExtractedAmount", value: extracted.vat, kind: "money" },
      ]
    },
  },
  {
    id: "marginMarkup",
    category: "business",
    inputs: [
      { key: "cost", labelKey: "calculators.inputs.cost", defaultValue: 80 },
      { key: "price", labelKey: "calculators.inputs.price", defaultValue: 120 },
    ],
    compute: (v) => {
      const result = calculateMarginAndMarkup(v.cost, v.price)
      return [
        { labelKey: "calculators.results.profit", value: result.profit, kind: "money" },
        { labelKey: "calculators.results.margin", value: result.marginPercent, kind: "percent" },
        { labelKey: "calculators.results.markup", value: result.markupPercent, kind: "percent" },
      ]
    },
  },
  {
    id: "revenueProfit",
    category: "business",
    inputs: [
      { key: "revenue", labelKey: "calculators.inputs.revenue", defaultValue: 100000 },
      { key: "costs", labelKey: "calculators.inputs.costs", defaultValue: 65000 },
    ],
    compute: (v) => {
      const result = calculateRevenueProfit(v.revenue, v.costs)
      return [
        { labelKey: "calculators.results.profit", value: result.profit, kind: "money", tone: result.profit >= 0 ? "positive" : "negative" },
        { labelKey: "calculators.results.margin", value: result.marginPercent, kind: "percent" },
      ]
    },
  },
  {
    id: "businessBreakEven",
    category: "business",
    inputs: [
      { key: "fixedCosts", labelKey: "calculators.inputs.fixedCosts", defaultValue: 100000 },
      { key: "pricePerUnit", labelKey: "calculators.inputs.pricePerUnit", defaultValue: 500 },
      { key: "variableCost", labelKey: "calculators.inputs.variableCost", defaultValue: 300 },
    ],
    compute: (v) => {
      const result = calculateBreakEvenPoint(v.fixedCosts, v.pricePerUnit, v.variableCost)
      return [
        { labelKey: "calculators.results.breakEvenUnits", value: result.units, kind: "number" },
        { labelKey: "calculators.results.breakEvenRevenue", value: result.revenue, kind: "money" },
      ]
    },
  },
  {
    id: "roi",
    category: "business",
    inputs: [
      { key: "investment", labelKey: "calculators.inputs.investment", defaultValue: 100000 },
      { key: "returnAmount", labelKey: "calculators.inputs.returnAmount", defaultValue: 135000 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.roi", value: calculateRoiPercent(v.investment, v.returnAmount), kind: "percent" }],
  },
  {
    id: "payback",
    category: "business",
    inputs: [
      { key: "investment", labelKey: "calculators.inputs.investment", defaultValue: 100000 },
      { key: "monthlyCashFlow", labelKey: "calculators.inputs.monthlyCashFlow", defaultValue: 10000 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.paybackMonths", value: calculatePaybackPeriodMonths(v.investment, v.monthlyCashFlow), kind: "months" }],
  },
  {
    id: "mortgagePayment",
    category: "loans",
    inputs: [
      { key: "principal", labelKey: "calculators.inputs.loanPrincipal", defaultValue: 5000000 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 12, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 240 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.monthlyPayment", value: calculateMortgageAnnuityPayment(v.principal, v.annualRate, v.months), kind: "money" }],
  },
  {
    id: "loanOverpayment",
    category: "loans",
    inputs: [
      { key: "principal", labelKey: "calculators.inputs.loanPrincipal", defaultValue: 1000000 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 10, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 60 },
    ],
    compute: (v) => {
      const result = calculateLoanOverpayment(v.principal, v.annualRate, v.months)
      return [
        { labelKey: "calculators.results.monthlyPayment", value: result.monthlyPayment, kind: "money" },
        { labelKey: "calculators.results.totalPaid", value: result.totalPaid, kind: "money" },
        { labelKey: "calculators.results.overpayment", value: result.overpayment, kind: "money" },
      ]
    },
  },
  {
    id: "annuityPayment",
    category: "loans",
    inputs: [
      { key: "principal", labelKey: "calculators.inputs.loanPrincipal", defaultValue: 1000000 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 9, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 120 },
    ],
    compute: (v) => [{ labelKey: "calculators.results.annuityPayment", value: calculateMortgageAnnuityPayment(v.principal, v.annualRate, v.months), kind: "money" }],
  },
  {
    id: "differentiatedPayment",
    category: "loans",
    inputs: [
      { key: "principal", labelKey: "calculators.inputs.loanPrincipal", defaultValue: 1000000 },
      { key: "annualRate", labelKey: "calculators.inputs.annualRate", defaultValue: 9, step: "0.1" },
      { key: "months", labelKey: "calculators.inputs.months", defaultValue: 120 },
    ],
    compute: (v) => {
      const result = calculateDifferentiatedLoan(v.principal, v.annualRate, v.months)
      return [
        { labelKey: "calculators.results.firstPayment", value: result.firstPayment, kind: "money" },
        { labelKey: "calculators.results.lastPayment", value: result.lastPayment, kind: "money" },
        { labelKey: "calculators.results.overpayment", value: result.overpayment, kind: "money" },
      ]
    },
  },
  {
    id: "incomeTax",
    category: "taxes",
    inputs: [
      { key: "income", labelKey: "calculators.inputs.income", defaultValue: 100000 },
      { key: "taxRate", labelKey: "calculators.inputs.taxRate", defaultValue: 13, step: "0.1" },
    ],
    compute: (v) => {
      const tax = calculateInvestmentProfitTax(v.income, v.taxRate)
      return [
        { labelKey: "calculators.results.tax", value: tax.tax, kind: "money" },
        { labelKey: "calculators.results.netIncome", value: tax.netProfit, kind: "money" },
      ]
    },
  },
  {
    id: "investmentProfitTax",
    category: "taxes",
    inputs: [
      { key: "profit", labelKey: "calculators.inputs.profit", defaultValue: 50000 },
      { key: "taxRate", labelKey: "calculators.inputs.taxRate", defaultValue: 13, step: "0.1" },
    ],
    compute: (v) => {
      const tax = calculateInvestmentProfitTax(v.profit, v.taxRate)
      return [
        { labelKey: "calculators.results.taxableProfit", value: tax.taxableProfit, kind: "money" },
        { labelKey: "calculators.results.tax", value: tax.tax, kind: "money" },
        { labelKey: "calculators.results.netProfit", value: tax.netProfit, kind: "money" },
      ]
    },
  },
  {
    id: "vatTax",
    category: "taxes",
    inputs: [
      { key: "amount", labelKey: "calculators.inputs.amount", defaultValue: 12000 },
      { key: "vatRate", labelKey: "calculators.inputs.vatRate", defaultValue: 20, step: "0.1" },
    ],
    compute: (v) => {
      const extracted = calculateVatExtract(v.amount, v.vatRate)
      return [
        { labelKey: "calculators.results.vatExtractedBase", value: extracted.base, kind: "money" },
        { labelKey: "calculators.results.vatExtractedAmount", value: extracted.vat, kind: "money" },
      ]
    },
  },
]

function formatResult(value: number | string | null, kind: ResultKind = "money", locale: string, t: (key: string) => string, currency: string) {
  if (typeof value === "string") return t(value)
  if (value === null || !Number.isFinite(value)) return t("common.notAvailable")

  if (kind === "percent") {
    return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 }).format(value)}%`
  }

  if (kind === "number") {
    return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 6 }).format(value)
  }

  if (kind === "months") {
    return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 1 }).format(value)} ${t("calculators.units.months")}`
  }

  return formatMoney(value, currency, locale as "ru" | "en")
}

function CalculatorCard({ definition }: { definition: CalculatorDefinition }) {
  const { locale, t } = useI18n()
  const { displayCurrency } = useDisplayCurrency()
  const initialValues = useMemo(
    () => Object.fromEntries(definition.inputs.map((input) => [input.key, input.defaultValue])),
    [definition.inputs],
  ) as Record<string, number>
  const [values, setValues] = useState<Record<string, number>>(initialValues)

  const results = useMemo(() => {
    try {
      return definition.compute(values)
    } catch {
      return []
    }
  }, [definition, values])

  const reset = () => setValues(initialValues)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t(`calculators.items.${definition.id}.title`)}</CardTitle>
            <CardDescription className="mt-1">{t(`calculators.items.${definition.id}.description`)}</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label={t("actions.reset")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {definition.inputs.map((input) => (
            <div key={input.key} className="space-y-2">
              <Label htmlFor={`${definition.id}-${input.key}`}>{t(input.labelKey)}</Label>
              <Input
                id={`${definition.id}-${input.key}`}
                type="number"
                min="0"
                step={input.step ?? "1"}
                value={values[input.key] ?? 0}
                onChange={(event) => {
                  const next = Number.parseFloat(event.target.value)
                  setValues((current) => ({
                    ...current,
                    [input.key]: Number.isFinite(next) ? Math.max(0, next) : 0,
                  }))
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-auto rounded-md border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{t("calculators.result")}</p>
          <div className="mt-2 space-y-2">
            {results.map((result) => (
              <div key={result.labelKey} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{t(result.labelKey)}</span>
                <span
                  className={
                    result.tone === "positive"
                      ? "text-sm font-semibold text-green-600"
                      : result.tone === "negative"
                        ? "text-sm font-semibold text-red-600"
                        : "text-sm font-semibold"
                  }
                >
                  {formatResult(result.value, result.kind, locale, t, displayCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="formula">
            <AccordionTrigger className="py-2 text-sm">{t("calculators.formula")}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {t(`calculators.items.${definition.id}.formula`)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

export default function CalculatorsPage() {
  const { t } = useI18n()
  const [activeCategory, setActiveCategory] = useState<CalculatorCategory>("investment")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return calculatorDefinitions.filter((definition) => {
      if (definition.category !== activeCategory) return false
      if (!normalized) return true
      return (
        t(`calculators.items.${definition.id}.title`).toLowerCase().includes(normalized) ||
        t(`calculators.items.${definition.id}.description`).toLowerCase().includes(normalized)
      )
    })
  }, [activeCategory, query, t])

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("calculators.title")} text={t("calculators.description")} />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("calculators.workspaceTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("calculators.disclaimer")}</p>
            </div>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("calculators.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as CalculatorCategory)} className="space-y-4">
        <TabsList className="flex flex-wrap">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {t(`calculators.categories.${category}`)}
              <Badge variant="secondary" className="ml-2">
                {calculatorDefinitions.filter((definition) => definition.category === category).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
                  {t("calculators.empty")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filtered.map((definition) => (
                  <CalculatorCard key={definition.id} definition={definition} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
