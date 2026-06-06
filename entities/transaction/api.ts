import { apiFetch } from "@/lib/api-client"
import { appendAccountScope, type AccountScope } from "@/lib/accounts/account-scope"

export type Transaction = {
  id: string
  userId: string
  accountId: string
  assetId: string | null
  type: "buy" | "sell" | "dividend" | "interest" | "deposit" | "withdrawal"
  quantity: number | null
  pricePerUnit: number | null
  totalAmount: number
  fee: number
  currency: string
  date: string
  notes: string | null
  accounts?: { name: string }
  assets?: { symbol: string; name: string } | null
}

type TransactionInsert = Omit<Transaction, "id" | "accounts" | "assets"> & { id?: string }

export async function fetchTransactions(userId: string, accountScope?: AccountScope): Promise<Transaction[]> {
  void userId
  const query = new URLSearchParams()
  if (accountScope) appendAccountScope(query, accountScope)
  const suffix = query.toString() ? `?${query.toString()}` : ""
  const data = await apiFetch<Transaction[]>(`/api/data/transactions${suffix}`)
  return data || []
}

export async function fetchRecentTransactions(userId: string, limit = 5, accountScope?: AccountScope) {
  void userId
  const query = new URLSearchParams({ limit: String(limit) })
  if (accountScope) appendAccountScope(query, accountScope)
  const data = await apiFetch<{ transactions: Transaction[] }>(`/api/data/transactions/recent?${query.toString()}`)
  return data?.transactions || []
}

export async function createTransaction(transaction: TransactionInsert) {
  const data = await apiFetch<{ transaction: Transaction }>("/api/data/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountId: transaction.accountId,
      assetId: transaction.assetId,
      type: transaction.type,
      quantity: transaction.quantity,
      pricePerUnit: transaction.pricePerUnit,
      totalAmount: transaction.totalAmount,
      fee: transaction.fee,
      currency: transaction.currency,
      date: transaction.date,
      notes: transaction.notes,
    }),
  })
  return data?.transaction || null
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  const data = await apiFetch<{ transaction: Transaction }>(`/api/data/transactions/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  return data?.transaction || null
}

export async function deleteTransaction(id: string) {
  const data = await apiFetch<{ success: boolean }>(`/api/data/transactions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return data?.success || false
}

