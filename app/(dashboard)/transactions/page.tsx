"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { useToast } from "@/components/ui/use-toast"
import { Plus, ArrowUpRight, ArrowDownRight, Search, RefreshCw } from "lucide-react"
import { createTransaction, Transaction } from "@/entities/transaction/api"
import { useI18n } from "@/contexts/i18n-context"
import { getTransactionTypeLabel } from "@/lib/i18n-display"
import { accountsQuery, assetsQuery, queryKeys, transactionsQuery } from "@/lib/query-options"

export default function TransactionsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    type: "all",
    account: "all",
    dateFrom: "",
    dateTo: "",
  })
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: "buy",
    date: new Date().toISOString(),
    currency: "USD",
    fee: 0,
  })

  const userId = user?.id ?? ""
  const enabled = Boolean(user)
  const transactionsResult = useQuery({ ...transactionsQuery(userId), enabled })
  const accountsResult = useQuery({ ...accountsQuery(userId), enabled })
  const assetsResult = useQuery({ ...assetsQuery(), enabled })
  const transactions = transactionsResult.data ?? []
  const accounts = accountsResult.data ?? []
  const assets = assetsResult.data ?? []

  const createTransactionMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: (newTx) => {
      if (!newTx || !user) return
      queryClient.setQueryData<Transaction[]>(queryKeys.transactions(user.id), (current = []) => [newTx, ...current])
      queryClient.setQueryData<Transaction[]>(queryKeys.recentTransactions(user.id, 5), (current = []) =>
        [newTx, ...current].slice(0, 5),
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts(user.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(user.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics(user.id) })
    },
  })

  // Fetch accounts and assets when dialog opens
  const handleOpenDialog = async () => {
    if (!user) return
    setFormError(null)
    setNewTransaction((previous) => ({
      ...previous,
      accountId: previous.accountId ?? accounts[0]?.id,
    }))
    setIsAddTransactionOpen(true)
  }

  const handleAddTransaction = async () => {
    if (!user || !newTransaction.accountId || !newTransaction.type || !newTransaction.date) {
      setFormError(t("transactions.toast.addErrorDescription"))
      return
    }

    setFormError(null)

    try {
      const newTx = await createTransactionMutation.mutateAsync({
        userId: user.id,
        accountId: newTransaction.accountId,
        assetId: newTransaction.assetId || null,
        type: newTransaction.type,
        quantity: newTransaction.quantity ?? null,
        pricePerUnit: newTransaction.pricePerUnit ?? null,
        totalAmount: newTransaction.totalAmount ?? 0,
        fee: newTransaction.fee ?? 0,
        currency: newTransaction.currency || "USD",
        date: newTransaction.date || new Date().toISOString(),
        notes: newTransaction.notes ?? null,
      })

      if (newTx) {
        toast({
          title: t("transactions.toast.addSuccessTitle"),
          description: t("transactions.toast.addSuccessDescription"),
          variant: "default",
        })
        setNewTransaction({
          type: "buy",
          date: new Date().toISOString(),
          currency: "USD",
          fee: 0,
          accountId: accounts[0]?.id,
        })
        setIsAddTransactionOpen(false)
      } else {
        setFormError(t("transactions.toast.addErrorDescription"))
        toast({
          title: t("transactions.toast.addErrorTitle"),
          description: t("transactions.toast.addErrorDescription"),
          variant: "destructive",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("transactions.toast.addErrorDescriptionGeneric")
      setFormError(message)
      toast({
        title: t("transactions.toast.addErrorTitle"),
        description: message,
        variant: "destructive",
      })
    } finally {
    }
  }

  const isLoading =
    (transactionsResult.isLoading && !transactionsResult.data) ||
    (accountsResult.isLoading && !accountsResult.data) ||
    (assetsResult.isLoading && !assetsResult.data)
  const isRefreshing =
    !isLoading && (transactionsResult.isFetching || accountsResult.isFetching || assetsResult.isFetching)
  const isSubmitting = createTransactionMutation.isPending

  const filteredTransactions = transactions.filter((transaction) => {
    // Search query filter
    const searchMatch =
      !searchQuery ||
      transaction.assets?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.assets?.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.accounts?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    // Type filter
    const typeMatch = filters.type === "all" || transaction.type === filters.type

    // Account filter
    const accountMatch = filters.account === "all" || transaction.accountId === filters.account

    // Date range filter
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null
    const transactionDate = new Date(transaction.date)

    const dateMatch = (!dateFrom || transactionDate >= dateFrom) && (!dateTo || transactionDate <= dateTo)

    return searchMatch && typeMatch && accountMatch && dateMatch
  })

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("transactions.title")} text={t("transactions.description")}>
        {isRefreshing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : null}
        <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.addTransaction")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("transactions.addDialogTitle")}</DialogTitle>
              <DialogDescription>{t("transactions.addDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {formError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-date" className="text-right">
                  {t("common.date")}
                </Label>
                <Input
                  id="transaction-date"
                  type="datetime-local"
                  value={newTransaction.date ? new Date(newTransaction.date).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, date: new Date(e.target.value).toISOString() })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-type" className="text-right">
                  {t("common.type")}
                </Label>
                <Select
                  value={newTransaction.type as string}
                  onValueChange={(value) =>
                    setNewTransaction({
                      ...newTransaction,
                      type: value as Transaction["type"],
                      assetId:
                        value === "deposit" || value === "withdrawal" || value === "interest"
                          ? null
                          : newTransaction.assetId,
                      quantity:
                        value === "dividend" || value === "interest" || value === "deposit" || value === "withdrawal"
                          ? undefined
                          : newTransaction.quantity,
                      pricePerUnit:
                        value === "dividend" || value === "interest" || value === "deposit" || value === "withdrawal"
                          ? undefined
                          : newTransaction.pricePerUnit,
                    })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("transactions.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">{t("transactionType.buy")}</SelectItem>
                    <SelectItem value="sell">{t("transactionType.sell")}</SelectItem>
                    <SelectItem value="dividend">{t("transactionType.dividend")}</SelectItem>
                    <SelectItem value="interest">{t("transactionType.interest")}</SelectItem>
                    <SelectItem value="deposit">{t("transactionType.deposit")}</SelectItem>
                    <SelectItem value="withdrawal">{t("transactionType.withdrawal")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-account" className="text-right">
                  {t("transactions.account")}
                </Label>
                <Select
                  value={newTransaction.accountId}
                  onValueChange={(value) => setNewTransaction({ ...newTransaction, accountId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("transactions.selectAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(newTransaction.type === "buy" ||
                newTransaction.type === "sell" ||
                newTransaction.type === "dividend") && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="transaction-asset" className="text-right">
                    {t("transactions.asset")}
                  </Label>
                  <Select
                    value={newTransaction.assetId ?? undefined}
                    onValueChange={(value) => setNewTransaction({ ...newTransaction, assetId: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t("transactions.selectAsset")} />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.symbol} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(newTransaction.type === "buy" || newTransaction.type === "sell") && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="transaction-quantity" className="text-right">
                      {t("transactions.quantity")}
                    </Label>
                    <Input
                      id="transaction-quantity"
                      type="number"
                      value={newTransaction.quantity || ""}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          quantity: Number.parseFloat(e.target.value),
                          totalAmount: Number.parseFloat(e.target.value) * (newTransaction.pricePerUnit || 0),
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="transaction-price" className="text-right">
                      {t("transactions.pricePerUnit")}
                    </Label>
                    <Input
                      id="transaction-price"
                      type="number"
                      value={newTransaction.pricePerUnit || ""}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          pricePerUnit: Number.parseFloat(e.target.value),
                          totalAmount: (newTransaction.quantity || 0) * Number.parseFloat(e.target.value),
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-total" className="text-right">
                  {t("transactions.totalAmount")}
                </Label>
                <Input
                  id="transaction-total"
                  type="number"
                  value={newTransaction.totalAmount || ""}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, totalAmount: Number.parseFloat(e.target.value) })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-fee" className="text-right">
                  {t("transactions.fee")}
                </Label>
                <Input
                  id="transaction-fee"
                  type="number"
                  value={newTransaction.fee || ""}
                  onChange={(e) => setNewTransaction({ ...newTransaction, fee: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-currency" className="text-right">
                  {t("common.currency")}
                </Label>
                <Select
                  value={newTransaction.currency}
                  onValueChange={(value) => setNewTransaction({ ...newTransaction, currency: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("transactions.selectCurrency")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction-notes" className="text-right">
                  {t("common.notes")}
                </Label>
                <Input
                  id="transaction-notes"
                  value={newTransaction.notes || ""}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTransactionOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddTransaction} disabled={isSubmitting || accounts.length === 0}>
                {isSubmitting ? t("common.loading") : t("actions.addTransaction")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-auto md:flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("transactions.searchPlaceholder")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t("common.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("transactions.allTypes")}</SelectItem>
                  <SelectItem value="buy">{t("transactionType.buy")}</SelectItem>
                  <SelectItem value="sell">{t("transactionType.sell")}</SelectItem>
                  <SelectItem value="dividend">{t("transactionType.dividend")}</SelectItem>
                  <SelectItem value="interest">{t("transactionType.interest")}</SelectItem>
                  <SelectItem value="deposit">{t("transactionType.deposit")}</SelectItem>
                  <SelectItem value="withdrawal">{t("transactionType.withdrawal")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.account} onValueChange={(value) => setFilters({ ...filters, account: value })}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t("transactions.account")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("transactions.allAccounts")}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder={t("common.from")}
                className="w-[130px]"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                type="date"
                placeholder={t("common.to")}
                className="w-[130px]"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
              <Button variant="outline" onClick={() => setFilters({ type: "all", account: "all", dateFrom: "", dateTo: "" })}>
                {t("actions.reset")}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("transactions.account")}</TableHead>
                    <TableHead>{t("transactions.asset")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead className="text-right">{t("transactions.quantity")}</TableHead>
                    <TableHead className="text-right">{t("transactions.pricePerUnit")}</TableHead>
                    <TableHead className="text-right">{t("common.total")}</TableHead>
                    <TableHead>{t("common.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                        {searchQuery || filters.type !== "all" || filters.account !== "all" || filters.dateFrom || filters.dateTo
                          ? t("transactions.noTransactionsByFilters")
                          : t("transactions.noTransactions")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
                        <TableCell>{transaction.accounts?.name || t("common.unknown")}</TableCell>
                        <TableCell>
                          {transaction.assets ? (
                            <div>
                              <div className="font-medium">{transaction.assets.name}</div>
                              <div className="text-sm text-muted-foreground">{transaction.assets.symbol}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {(transaction.type === "buy" || transaction.type === "deposit") && (
                              <ArrowDownRight className="mr-1 h-4 w-4 text-green-500" />
                            )}
                            {(transaction.type === "sell" || transaction.type === "withdrawal") && (
                              <ArrowUpRight className="mr-1 h-4 w-4 text-red-500" />
                            )}
                            <span>{getTransactionTypeLabel(transaction.type, t)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.quantity
                            ? transaction.quantity.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 4,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.pricePerUnit
                            ? `${transaction.currency} ${transaction.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.currency}{" "}
                          {transaction.totalAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{transaction.notes || "-"}</TableCell>
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

