type Transaction = {
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

// Fetch all transactions for a user
export async function fetchTransactions(userId: string) {
  console.warn(`Not implemented: fetchTransactions(${userId})`)
  return []
}

// Fetch recent transactions for a user
export async function fetchRecentTransactions(userId: string, limit = 5) {
  void userId
  try {
    const res = await fetch(`/api/data/transactions/recent?limit=${encodeURIComponent(String(limit))}`, { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchRecentTransactions failed:", data?.error)
      return []
    }
    return (data?.transactions as Transaction[]) || []
  } catch (e) {
    console.warn("fetchRecentTransactions error:", e)
    return []
  }
}

// Create a new transaction
export async function createTransaction(transaction: TransactionInsert) {
  console.warn(`Not implemented: createTransaction(${transaction.type})`)
  return null
}

// Update a transaction
export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  console.warn(`Not implemented: updateTransaction(${id})`)
  return null
}

// Delete a transaction
export async function deleteTransaction(id: string) {
  console.warn(`Not implemented: deleteTransaction(${id})`)
  return null
}

