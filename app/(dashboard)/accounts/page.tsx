"use client"

import Link from "next/link"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { AccountSwitcher } from "@/components/account-switcher"
import { CurrencyConversionWarning } from "@/components/currency-conversion-warning"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, RefreshCw, CheckCircle2, BarChart3, Download, LayoutDashboard } from "lucide-react"
import { createAccount, deleteAccount, Account } from "@/entities/account/api"
import { useI18n } from "@/contexts/i18n-context"
import { useSelectedAccount } from "@/hooks/use-selected-account"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { fetchCurrencyRates } from "@/entities/currency/api"
import { convertMoney } from "@/lib/currency/conversion"
import { formatMoney } from "@/lib/currency/formatting"
import { getAccountTypeLabel } from "@/lib/i18n-display"
import { accountsQuery, analyticsQuery, marketDataCache, queryKeys, transactionsQuery } from "@/lib/query-options"

export default function AccountsPage() {
  const { user } = useAuth()
  const { locale, t } = useI18n()
  const { scope, selectedAccount, setSelectedAccountId } = useSelectedAccount()
  const { displayCurrency } = useDisplayCurrency()
  const queryClient = useQueryClient()
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    type: "brokerage",
    currency: displayCurrency,
  })

  const userId = user?.id ?? ""
  const accountsResult = useQuery({ ...accountsQuery(userId), enabled: Boolean(user) })
  const accounts = accountsResult.data ?? []
  const accountRateSymbols = Array.from(
    new Set(["USD", "EUR", displayCurrency, ...accounts.map((account) => account.currency || "RUB")].map((currency) => currency.toUpperCase())),
  ).filter((currency) => currency !== "RUB")
  const transactionsResult = useQuery({ ...transactionsQuery(userId, scope), enabled: Boolean(user) })
  const analyticsResult = useQuery({ ...analyticsQuery(userId, scope, displayCurrency), enabled: Boolean(user) })
  const ratesResult = useQuery({
    queryKey: ["currency-rates", "accounts", displayCurrency, accountRateSymbols.join(",")],
    queryFn: () => fetchCurrencyRates(accountRateSymbols),
    enabled: Boolean(user) && accountRateSymbols.length > 0,
    ...marketDataCache,
  })
  const scopedTransactions = transactionsResult.data ?? []
  const analytics = analyticsResult.data

  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: (createdAccount) => {
      if (!createdAccount || !user) return
      queryClient.setQueryData<Account[]>(queryKeys.accounts(user.id), (current = []) => [...current, createdAccount])
      void queryClient.invalidateQueries({ queryKey: ["portfolio-allocation", user.id] })
      void queryClient.invalidateQueries({ queryKey: ["analytics", user.id] })
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: (_result, id) => {
      if (!user) return
      queryClient.setQueryData<Account[]>(queryKeys.accounts(user.id), (current = []) =>
        current.filter((account) => account.id !== id),
      )
      void queryClient.invalidateQueries({ queryKey: ["transactions", user.id] })
      void queryClient.invalidateQueries({ queryKey: ["portfolio-allocation", user.id] })
      void queryClient.invalidateQueries({ queryKey: ["analytics", user.id] })
    },
  })

  const handleAddAccount = async () => {
    if (!user || !newAccount.name || !newAccount.type) {
      return
    }

    try {
      const createdAccount = await createAccountMutation.mutateAsync({
        userId: user.id,
        name: newAccount.name,
        type: newAccount.type as any,
        balance: newAccount.balance || 0,
        currency: newAccount.currency || displayCurrency,
      })

      if (!createdAccount) {
        console.error("Failed to create account")
        return
      }

      setNewAccount({
        type: "brokerage",
        currency: displayCurrency,
      })
    } catch (error) {
      console.error("Error adding account:", error)
    } finally {
      setIsAddAccountOpen(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm(t("accounts.confirmDelete"))) {
      return
    }

    try {
      await deleteAccountMutation.mutateAsync(id)
    } catch (error) {
      console.error("Error deleting account:", error)
    }
  }

  const filteredAccounts = accounts.filter(
    (account) =>
      account?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account?.type?.toLowerCase().includes(searchQuery.toLowerCase()),
  )
  const isLoading = accountsResult.isLoading && !accountsResult.data
  const isRefreshing = (accountsResult.isFetching || transactionsResult.isFetching || analyticsResult.isFetching) && !isLoading
  const isSubmitting = createAccountMutation.isPending
  const activeAccount = selectedAccount
  const summaryCurrency = analytics?.currency.baseCurrency ?? displayCurrency
  const rates = ratesResult.data?.rates.map((rate) => ({
    base: "RUB" as const,
    quote: rate.currency,
    value: rate.value,
    nominal: rate.nominal,
    date: ratesResult.data?.dateFormatted ?? ratesResult.data?.date ?? "",
    source: "CBR" as const,
  })) ?? []
  const lastTransaction = scopedTransactions[0]
  const formatAccountBalance = (account: Account) => {
    const native = formatMoney(account.balance || 0, account.currency || "RUB", locale)
    if ((account.currency || "RUB").toUpperCase() === displayCurrency) return native
    const converted = convertMoney({ amount: account.balance || 0, currency: account.currency || "RUB" }, displayCurrency, rates, {
      stale: ratesResult.data?.stale,
    })
    if (converted.error) return `${native}\n${t("currency.rates.unavailableShort")}`
    return `${native}\n≈ ${formatMoney(converted.converted.amount, displayCurrency, locale)}`
  }
  const scopeValueLabel = analytics
    ? formatMoney(analytics.summary.totalPortfolioValue, summaryCurrency, locale)
    : activeAccount
      ? formatMoney(activeAccount.balance ?? 0, activeAccount.currency || "RUB", locale)
      : formatMoney(0, summaryCurrency, locale)

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("accounts.title")} text={t("accounts.description")}>
        {isRefreshing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : null}
        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.addAccount")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("accounts.addDialogTitle")}</DialogTitle>
              <DialogDescription>{t("accounts.addDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {t("common.name")}
                </Label>
                <Input
                  id="name"
                  value={newAccount.name || ""}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  {t("common.type")}
                </Label>
                <Select
                  value={newAccount.type as string}
                  onValueChange={(value) => setNewAccount({ ...newAccount, type: value as any })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("accounts.selectAccountType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brokerage">{t("accountType.brokerage")}</SelectItem>
                    <SelectItem value="bank">{t("accountType.bank")}</SelectItem>
                    <SelectItem value="crypto">{t("accountType.crypto")}</SelectItem>
                    <SelectItem value="retirement">{t("accountType.retirement")}</SelectItem>
                    <SelectItem value="other">{t("accountType.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="balance" className="text-right">
                  {t("common.amount")}
                </Label>
                <Input
                  id="balance"
                  type="number"
                  value={newAccount.balance || ""}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  {t("common.currency")}
                </Label>
                <Select
                  value={newAccount.currency}
                  onValueChange={(value) => setNewAccount({ ...newAccount, currency: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("transactions.selectCurrency")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="RUB">RUB</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddAccount} disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("actions.addAccount")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("accounts.activeAccount")}</CardTitle>
            <CardDescription>{t("accounts.activeAccountDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSwitcher />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("accounts.scopeValue")}</p>
                <p className="text-lg font-semibold">
                  {scopeValueLabel}
                </p>
              </div>
              <div className="rounded-md border border-border/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("accounts.transactions")}</p>
                <p className="text-lg font-semibold">{scopedTransactions.length}</p>
              </div>
              <div className="rounded-md border border-border/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("accounts.assetsCount")}</p>
                <p className="text-lg font-semibold">{analytics?.summary.assetCount ?? 0}</p>
              </div>
              <div className="rounded-md border border-border/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("accounts.lastTransaction")}</p>
                <p className="text-sm font-medium">
                  {lastTransaction
                    ? new Date(lastTransaction.date).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")
                    : t("common.notAvailable")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{activeAccount?.name ?? t("accounts.allAccounts")}</CardTitle>
            <CardDescription>
              {activeAccount ? getAccountTypeLabel(activeAccount.type, t) : t("accounts.allAccountsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("common.currency")}</p>
                <p className="text-sm font-medium">{activeAccount?.currency ?? t("accounts.allAccounts")} / {summaryCurrency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("analytics.summary.totalPnl")}</p>
                <p className="text-sm font-medium">{formatMoney(analytics?.summary.totalPnL ?? 0, summaryCurrency, locale)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("analytics.summary.diversificationScore")}</p>
                <p className="text-sm font-medium">{analytics?.summary.diversificationScore ?? 0}/100</p>
              </div>
            </div>
            <CurrencyConversionWarning status={analytics?.currency.conversionStatus} stale={analytics?.currency.stale} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/transactions">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("actions.addTransaction")}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/export">
                  <Download className="mr-2 h-4 w-4" />
                  {t("accounts.exportAccount")}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {t("accounts.openAnalytics")}
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {t("accounts.openDashboard")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("accounts.searchPlaceholder")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">{t("common.name")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead className="text-right">{t("common.amount")}</TableHead>
                    <TableHead>{t("common.currency")}</TableHead>
                    <TableHead className="w-[140px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        {searchQuery
                          ? t("accounts.noAccountsBySearch")
                          : t("accounts.noAccounts")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account?.name || "-"}</TableCell>
                        <TableCell>{getAccountTypeLabel(account?.type, t)}</TableCell>
                        <TableCell className="text-right">
                          <span className="whitespace-pre-line">{formatAccountBalance(account)}</span>
                        </TableCell>
                        <TableCell>{account?.currency || "RUB"}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant={scope.type === "single" && scope.accountId === account.id ? "secondary" : "ghost"}
                              size="icon"
                              onClick={() => setSelectedAccountId(account.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="sr-only">{t("accounts.selectAccount")}</span>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/accounts/${account.id}`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">{t("common.edit")}</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAccount(account.id)}
                              disabled={deleteAccountMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">{t("common.delete")}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

