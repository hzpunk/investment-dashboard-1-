"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"
import { getTransactionTypeLabel } from "@/lib/i18n-display"

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  accounts?: { name: string } | null
  assets?: { symbol: string; name: string } | null
}

interface RecentTransactionsProps {
  className?: string
  transactions: Transaction[]
}

export function RecentTransactions({ className, transactions = [] }: RecentTransactionsProps) {
  const { user } = useAuth()
  const { t } = useI18n()
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: "buy",
    date: new Date().toISOString(),
    currency: "USD",
    fee: 0,
  })

  // Fetch accounts and assets when dialog opens
  const handleOpenDialog = async () => {
    if (!user) return

    try {
      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", user.id)

      if (accountsError) throw accountsError

      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase.from("assets").select("id, symbol, name")

      if (assetsError) throw assetsError

      setAccounts(accountsData || [])
      setAssets(assetsData || [])

      // Set default account if available
      if (accountsData && accountsData.length > 0) {
        setNewTransaction((prev) => ({ ...prev, account_id: accountsData[0].id }))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }

    setIsAddTransactionOpen(true)
  }

  const handleAddTransaction = async () => {
    if (!user || !newTransaction.account_id || !newTransaction.type || !newTransaction.date) {
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.from("transactions").insert({
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

      if (error) throw error

      // Refresh the page to show the new transaction
      window.location.reload()
    } catch (error) {
      console.error("Error adding transaction:", error)
    } finally {
      setIsLoading(false)
      setIsAddTransactionOpen(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("dashboard.recentTransactions")}</CardTitle>
          <CardDescription>{t("transactions.description")}</CardDescription>
        </div>
        <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenDialog}>
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
              <Button onClick={handleAddTransaction} disabled={isLoading}>
                {isLoading ? t("common.loading") : t("actions.addTransaction")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("transactions.account")}</TableHead>
                <TableHead>{t("transactions.asset")}</TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    {t("transactions.noTransactions")}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
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
                    <TableCell className="text-right font-medium">
                      {transaction.currency} {transaction.total_amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

