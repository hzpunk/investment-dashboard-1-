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
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { fetchAccounts, createAccount, deleteAccount } from "@/entities/account/api"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"
import { getAccountTypeLabel } from "@/lib/i18n-display"

type Account = Database["public"]["Tables"]["accounts"]["Row"]

export default function AccountsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    type: "brokerage",
    currency: "USD",
  })

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const data = await fetchAccounts(user.id)
        setAccounts(data)
      } catch (error) {
        console.error("Error fetching accounts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccounts()
  }, [user])

  const handleAddAccount = async () => {
    if (!user || !newAccount.name || !newAccount.type) {
      return
    }

    setIsSubmitting(true)

    try {
      const createdAccount = await createAccount({
        user_id: user.id,
        name: newAccount.name,
        type: newAccount.type as any,
        balance: newAccount.balance || 0,
        currency: newAccount.currency || "USD",
      })

      setAccounts([...accounts, createdAccount])
      setNewAccount({
        type: "brokerage",
        currency: "USD",
      })
    } catch (error) {
      console.error("Error adding account:", error)
    } finally {
      setIsSubmitting(false)
      setIsAddAccountOpen(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm(t("accounts.confirmDelete"))) {
      return
    }

    try {
      await deleteAccount(id)
      setAccounts(accounts.filter((account) => account.id !== id))
    } catch (error) {
      console.error("Error deleting account:", error)
    }
  }

  const filteredAccounts = accounts.filter(
    (account) =>
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("accounts.title")} text={t("accounts.description")}>
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
                    <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
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
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{getAccountTypeLabel(account.type, t)}</TableCell>
                        <TableCell className="text-right">
                          {account.balance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`/accounts/${account.id}`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">{t("common.edit")}</span>
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(account.id)}>
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

