"use client"

import { useEffect, useState } from "react"
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
import { Plus, ArrowUpRight, ArrowDownRight, Search } from "lucide-react"
import { fetchTransactions, createTransaction } from "@/entities/transaction/api"
import { fetchAccounts } from "@/entities/account/api"
import { fetchAssets } from "@/entities/asset/api"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"
import { getTransactionTypeLabel } from "@/lib/i18n-display"

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  accounts?: { name: string } | null
  assets?: { symbol: string; name: string } | null
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    type: "",
    account: "",
    dateFrom: "",
    dateTo: "",
  })
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: "buy",
    date: new Date().toISOString(),
    currency: "USD",
    fee: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch transactions
        const transactionsData = await fetchTransactions(user.id)
        setTransactions(transactionsData)

        // Fetch accounts for filter
        const accountsData = await fetchAccounts(user.id)
        setAccounts(accountsData)

        // Fetch assets for reference
        const assetsData = await fetchAssets()
        setAssets(assetsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  // Fetch accounts and assets when dialog opens
  const handleOpenDialog = async () => {
    if (!user) return
    setIsAddTransactionOpen(true)
  }

  const handleAddTransaction = async () => {
    if (!user || !newTransaction.account_id || !newTransaction.type || !newTransaction.date) {
      return
    }

    setIsSubmitting(true)

    try {
      await createTransaction({
        user_id: user.id,
        account_id: newTransaction.account_id,
        asset_id: newTransaction.asset_id,
        type: newTransaction.type as any,
        quantity: newTransaction.quantity,
        price_per_unit: newTransaction.price_per_unit,
        total_amount: newTransaction.total_amount || 0,
        fee: newTransaction.fee || 0,
        currency: newTransaction.currency || "USD",
        date: newTransaction.date,
        notes: newTransaction.notes,
      })

      // Refresh the page to show the new transaction
      window.location.reload()
    } catch (error) {
      console.error("Error adding transaction:", error)
    } finally {
      setIsSubmitting(false)
      setIsAddTransactionOpen(false)
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    // Search query filter
    const searchMatch =
      !searchQuery ||
      transaction.assets?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.assets?.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.accounts?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    // Type filter
    const typeMatch = !filters.type || transaction.type === filters.type

    // Account filter
    const accountMatch = !filters.account || transaction.account_id === filters.account

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
                      type: value as any,
                      quantity: value === "dividend" || value === "interest" ? undefined : newTransaction.quantity,
                      price_per_unit:
                        value === "dividend" || value === "interest" ? undefined : newTransaction.price_per_unit,
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
                  value={newTransaction.account_id}
                  onValueChange={(value) => setNewTransaction({ ...newTransaction, account_id: value })}
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
                    value={newTransaction.asset_id}
                    onValueChange={(value) => setNewTransaction({ ...newTransaction, asset_id: value })}
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
                          total_amount: Number.parseFloat(e.target.value) * (newTransaction.price_per_unit || 0),
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
                      value={newTransaction.price_per_unit || ""}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          price_per_unit: Number.parseFloat(e.target.value),
                          total_amount: (newTransaction.quantity || 0) * Number.parseFloat(e.target.value),
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
                  value={newTransaction.total_amount || ""}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, total_amount: Number.parseFloat(e.target.value) })
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
              <Button onClick={handleAddTransaction} disabled={isSubmitting}>
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
              <Button variant="outline" onClick={() => setFilters({ type: "", account: "", dateFrom: "", dateTo: "" })}>
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
                        {searchQuery || filters.type || filters.account || filters.dateFrom || filters.dateTo
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
                          {transaction.price_per_unit
                            ? `${transaction.currency} ${transaction.price_per_unit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {transaction.currency}{" "}
                          {transaction.total_amount.toLocaleString(undefined, {
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

