"use client"

import { Check, Languages } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { supportedLocales } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1 px-2" aria-label={t("header.language")}>
          <Languages className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("header.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedLocales.map((supportedLocale) => (
          <DropdownMenuItem key={supportedLocale} onClick={() => setLocale(supportedLocale)} className="gap-2">
            <span className="w-6 text-xs font-semibold uppercase">{supportedLocale}</span>
            <span>{t(`language.${supportedLocale}`)}</span>
            {locale === supportedLocale ? <Check className="ml-auto h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
