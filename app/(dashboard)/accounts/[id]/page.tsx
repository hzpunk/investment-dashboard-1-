"use client"

import { useEffect, useState } from "react"
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
import { fetchAccountById, updateAccount, deleteAccount } from "@/entities/account/api"
import { fetchTransactions } from "@/entities/transaction/api"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import type { Database } from "@/types/supabase"

type Account = Database["public"]["Tables"]["accounts"]["Row"]
type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & {
  assets?: { symbol: string; name: string } | null
}

export default function AccountDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
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
        const accountData = await fetchAccountById(params.id)
        setAccount(accountData)

        // Set form values
        setName(accountData.name)
        setType(accountData.type)
        setBalance(accountData.balance)
        setCurrency(accountData.currency)

        // Fetch account transactions
        const transactionsData = await fetchTransactions(user.id)
        setTransactions(transactionsData.filter((t) => t.account_id === params.id))
      } catch (error) {
        console.error("Error fetching account data:", error)
        setMessage({ type: "error", text: "Failed to load account data" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, params.id])

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
      setMessage({ type: "success", text: "Account updated successfully" })
    } catch (error) {
      console.error("Error updating account:", error)
      setMessage({ type: "error", text: "Failed to update account" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!account) return

    if (!confirm("Are you sure you want to delete this account? This will also delete all associated transactions.")) {
      return
    }

    try {
      await deleteAccount(account.id)
      router.push("/accounts")
    } catch (error) {
      console.error("Error deleting account:", error)
      setMessage({ type: "error", text: "Failed to delete account" })
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
        <h2 className="text-2xl font-bold mb-2">Account not found</h2>
        <p className="text-muted-foreground mb-4">
          The account you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild variant="outline">
          <a href="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Accounts
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={account.name} text={`Manage your ${account.type} account`}>
        <Button variant="outline" asChild>
          <a href="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>
      </DashboardHeader>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Account Details</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>View and update your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brokerage">Brokerage</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number.parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
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
                Delete Account
              </Button>
              <Button onClick={handleUpdateAccount} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Account Transactions</CardTitle>
              <CardDescription>View all transactions for this account.</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found for this account.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Type</th>
                        <th className="p-2 text-left font-medium">Asset</th>
                        <th className="p-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="p-2">{new Date(transaction.date).toLocaleDateString()}</td>
                          <td className="p-2 capitalize">{transaction.type}</td>
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
                <a href={`/transactions?account=${account.id}`}>View All Transactions</a>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

