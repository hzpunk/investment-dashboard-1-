"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { fetchAccountById, updateAccount, deleteAccount, Account } from "@/entities/account/api"
import { fetchTransactions } from "@/entities/transaction/api"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"
import { getAccountTypeLabel, getTransactionTypeLabel } from "@/lib/i18n-display"
type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  assets?: { symbol: string; name: string } | null
}

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [type, setType] = useState<string>("")
  const [balance, setBalance] = useState<number>(0)
  const [currency, setCurrency] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch account details
        const accountData = await fetchAccountById(id)
        if (!accountData) {
          setMessage({ type: "error", text: t("errors.unavailable") })
          return
        }
        setAccount(accountData)

        // Set form values
        setName(accountData.name)
        setType(accountData.type)
        setBalance(accountData.balance)
        setCurrency(accountData.currency)

        // Fetch account transactions
        const transactionsData = await fetchTransactions(user.id)
        setTransactions(transactionsData.filter((t) => t.account_id === id))
      } catch (error) {
        console.error("Error fetching account data:", error)
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, id])

  const handleUpdateAccount = async () => {
    if (!account) return

    setIsSaving(true)
    setMessage(null)

    try {
      const updatedAccount = await updateAccount(account.id, {
        name,
        type: type as any,
        balance,
        currency,
      })

      setAccount(updatedAccount)
      setMessage({ type: "success", text: t("actions.saveChanges") })
    } catch (error) {
      console.error("Error updating account:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!account) return

    if (!confirm(t("accounts.confirmDelete"))) {
      return
    }

    try {
      await deleteAccount(account.id)
      router.push("/accounts")
    } catch (error) {
      console.error("Error deleting account:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">{t("accounts.notFound")}</h2>
        <p className="text-muted-foreground mb-4">
          {t("accounts.notFoundDescription")}
        </p>
        <Button asChild variant="outline">
          <a href="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.backToAccounts")}
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={account.name} text={t("accounts.manageAccountText")}>
        <Button variant="outline" asChild>
          <a href="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </a>
        </Button>
      </DashboardHeader>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t("accounts.details")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("accounts.transactions")}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>{t("accounts.details")}</CardTitle>
              <CardDescription>{t("accounts.detailsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t("accounts.accountType")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor="balance">{t("common.amount")}</Label>
                <Input
                  id="balance"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number.parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">{t("common.currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
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
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("actions.deleteAccount")}
              </Button>
              <Button onClick={handleUpdateAccount} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? t("common.loading") : t("actions.saveChanges")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>{t("accounts.transactions")}</CardTitle>
              <CardDescription>{t("accounts.transactionsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t("accounts.noTransactions")}</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">{t("common.date")}</th>
                        <th className="p-2 text-left font-medium">{t("common.type")}</th>
                        <th className="p-2 text-left font-medium">{t("transactions.asset")}</th>
                        <th className="p-2 text-right font-medium">{t("common.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                          <td className="p-2">{getTransactionTypeLabel(transaction.type, t)}</td>
                          <td className="p-2">{transaction.assets ? transaction.assets.symbol : "-"}</td>
                          <td className="p-2 text-right">
                            {transaction.currency} {transaction.total_amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="ml-auto">
                <a href={`/transactions?account=${account.id}`}>{t("accounts.viewAllTransactions")}</a>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

