type Account = {
  id: string
  userId: string
  name: string
  type: "brokerage" | "bank" | "crypto" | "retirement" | "other"
  balance: number
  currency: string
  createdAt: string
}

type AccountInsert = Omit<Account, "id" | "createdAt"> & { createdAt?: string }

// Fetch all accounts for a user
export async function fetchAccounts(userId: string) {
  void userId
  const res = await fetch("/api/data/accounts", { method: "GET" })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts")
  return (data?.accounts as Account[]) || []
}

// Fetch a single account by ID
export async function fetchAccountById(id: string) {
  throw new Error(`Not implemented: fetchAccountById(${id})`)
}

// Create a new account
export async function createAccount(account: AccountInsert) {
  throw new Error(`Not implemented: createAccount(${account.name})`)
}

// Update an account
export async function updateAccount(id: string, updates: Partial<Account>) {
  throw new Error(`Not implemented: updateAccount(${id})`)
}

// Delete an account
export async function deleteAccount(id: string) {
  throw new Error(`Not implemented: deleteAccount(${id})`)
}

