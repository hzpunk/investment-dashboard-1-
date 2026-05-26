import { createLogger } from "@/lib/logger"

const logger = createLogger("TransactionAPI")

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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options)
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      logger.warn(`API request failed: ${url}`, data?.error)
      return null
    }

    return data as T
  } catch (error) {
    logger.error(`API request error: ${url}`, error)
    return null
  }
}

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  void userId
  const data = await apiFetch<Transaction[]>("/api/data/transactions")
  return data || []
}

export async function fetchRecentTransactions(userId: string, limit = 5) {
  void userId
  const data = await apiFetch<{ transactions: Transaction[] }>(`/api/data/transactions/recent?limit=${encodeURIComponent(String(limit))}`)
  return data?.transactions || []
}

export async function createTransaction(transaction: TransactionInsert) {
  const data = await apiFetch<{ transaction: Transaction }>("/api/data/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: transaction.accountId,
      asset_id: transaction.assetId,
      type: transaction.type,
      quantity: transaction.quantity,
      price_per_unit: transaction.pricePerUnit,
      total_amount: transaction.totalAmount,
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

