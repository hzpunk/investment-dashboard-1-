"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"

type CurrencyConversionWarningProps = {
  status?: "not_required" | "converted" | "partial" | "unavailable"
  stale?: boolean
  warnings?: string[]
  className?: string
}

export function CurrencyConversionWarning({ status, stale, warnings = [], className }: CurrencyConversionWarningProps) {
  const { t } = useI18n()
  const historicalApproximate = warnings.includes("CURRENCY_HISTORICAL_CONVERSION_APPROXIMATE")
  if (!stale && status !== "partial" && status !== "unavailable" && !historicalApproximate) return null
  const message = stale
    ? t("currency.rates.stale")
    : status === "partial"
      ? t("currency.conversion.partial")
      : status === "unavailable"
        ? t("currency.conversion.unavailable")
        : t("currency.conversion.historicalApproximate")

  return (
    <div className={cn("flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300", className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
