"use client"

import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/contexts/i18n-context"

type CurrencyRateBadgeProps = {
  status: "fresh" | "stale" | "unavailable" | "partial" | "same"
}

export function CurrencyRateBadge({ status }: CurrencyRateBadgeProps) {
  const { t } = useI18n()
  if (status === "same") return null

  const variant = status === "fresh" ? "secondary" : "outline"
  const label =
    status === "fresh"
      ? t("currency.conversion.converted")
      : status === "stale"
        ? t("currency.rates.staleShort")
        : status === "partial"
          ? t("currency.conversion.partialShort")
          : t("currency.rates.unavailableShort")

  return <Badge variant={variant}>{label}</Badge>
}
