"use client"

import { Check, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/contexts/i18n-context"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { formatCurrencyName } from "@/lib/currency/formatting"
import { supportedDisplayCurrencies } from "@/lib/currency/display-currency"

export function CurrencySwitcher() {
  const { locale, t } = useI18n()
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1 px-2" aria-label={t("currency.switcher.label")}>
          <Coins className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase">{displayCurrency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("currency.displayCurrency")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedDisplayCurrencies.map((currency) => (
          <DropdownMenuItem key={currency} onClick={() => setDisplayCurrency(currency)} className="gap-2">
            <span className="w-10 text-xs font-semibold uppercase">{currency}</span>
            <span>{formatCurrencyName(currency, locale)}</span>
            {displayCurrency === currency ? <Check className="ml-auto h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
