"use client"

import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/contexts/i18n-context"
import { fetchCurrencyRates } from "@/entities/currency/api"
import { formatMoney } from "@/lib/currency/formatting"
import { marketDataCache } from "@/lib/query-options"

export function CbrRatesWidget() {
  const { locale, t } = useI18n()
  const ratesQuery = useQuery({
    queryKey: ["currency-rates", "CBR", "USD,EUR,CNY"],
    queryFn: () => fetchCurrencyRates(["USD", "EUR", "CNY"]),
    ...marketDataCache,
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("currency.rates.title")}</CardTitle>
            <CardDescription>{t("currency.rates.sourceCbr")}</CardDescription>
          </div>
          {ratesQuery.isFetching ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ratesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
        ) : ratesQuery.isError || !ratesQuery.data ? (
          <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            {t("currency.rates.unavailable")}
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              {ratesQuery.data.rates.map((rate) => (
                <div key={rate.currency} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2">
                  <div className="font-medium">{rate.currency}/RUB</div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(rate.rubPerUnit, "RUB", locale)}</div>
                    {rate.nominal !== 1 ? (
                      <div className="text-xs text-muted-foreground">{t("currency.rates.perNominal").replace("{nominal}", String(rate.nominal))}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{t("currency.rates.updatedAt")}: {ratesQuery.data.dateFormatted || ratesQuery.data.date}</span>
              {ratesQuery.data.stale ? <Badge variant="outline">{t("currency.rates.staleShort")}</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">{t("currency.rates.referenceNote")}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
