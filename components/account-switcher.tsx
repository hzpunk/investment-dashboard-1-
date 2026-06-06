"use client"

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/contexts/i18n-context"
import { useSelectedAccount } from "@/hooks/use-selected-account"
import { getAccountTypeLabel } from "@/lib/i18n-display"

type AccountSwitcherProps = {
  label?: string
  className?: string
  compact?: boolean
}

export function AccountSwitcher({ label, className, compact = false }: AccountSwitcherProps) {
  const { t } = useI18n()
  const { accounts, accountIdParam, setSelectedAccountId, selectedAccount } = useSelectedAccount()

  return (
    <div className={className}>
      {!compact ? <Label className="mb-2 block text-xs text-muted-foreground">{label ?? t("accounts.currentScope")}</Label> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={accountIdParam} onValueChange={setSelectedAccountId}>
          <SelectTrigger className={compact ? "w-[190px]" : "w-full min-w-[220px] sm:w-[280px]"}>
            <SelectValue placeholder={t("accounts.selectScope")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("accounts.allAccounts")}</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedAccount ? (
          <>
            <Badge variant="secondary">{selectedAccount.currency}</Badge>
            <Badge variant="outline">{getAccountTypeLabel(selectedAccount.type, t)}</Badge>
          </>
        ) : (
          <Badge variant="secondary">{t("accounts.allAccounts")}</Badge>
        )}
      </div>
    </div>
  )
}

