export type Account = {
  id: string
  userId: string
  name: string
  type: "brokerage" | "bank" | "crypto" | "retirement" | "other"
  balance: number
  currency: string
  createdAt: string
}

export type AccountInsert = Omit<Account, "id" | "createdAt"> & { createdAt?: string }

// Fetch all accounts for a user
export async function fetchAccounts(userId: string) {
  void userId
  try {
    const res = await fetch("/api/data/accounts", { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchAccounts failed:", data?.error)
      return []
    }
    return (data?.accounts as Account[]) || []
  } catch (e) {
    console.warn("fetchAccounts error:", e)
    return []
  }
}

// Fetch a single account by ID
export async function fetchAccountById(id: string): Promise<Account | null> {
  console.warn(`Not implemented: fetchAccountById(${id})`)
  try {
    const res = await fetch(`/api/data/accounts/${id}`, { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchAccountById failed:", data?.error)
      return null
    }
    return data?.account as Account || null
  } catch (e) {
    console.warn("fetchAccountById error:", e)
    return null
  }
}

// Create a new account
export async function createAccount(account: AccountInsert) {
  console.warn(`Not implemented: createAccount(${account.name})`)
  return null
}

// Update an account
export async function updateAccount(id: string, updates: Partial<Account>) {
  console.warn(`Not implemented: updateAccount(${id})`)
  return null
}

// Delete an account
export async function deleteAccount(id: string) {
  console.warn(`Not implemented: deleteAccount(${id})`)
  return null
}

