import { apiFetch } from "@/lib/api-client"

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

export async function fetchAccounts(userId: string) {
  void userId
  const data = await apiFetch<{ accounts: Account[] }>("/api/data/accounts")
  return data?.accounts || []
}

export async function fetchAccountById(id: string): Promise<Account | null> {
  const data = await apiFetch<{ account: Account }>(`/api/data/accounts/${encodeURIComponent(id)}`)
  return data?.account || null
}

export async function createAccount(account: AccountInsert) {
  const data = await apiFetch<{ account: Account }>("/api/data/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  })
  return data?.account || null
}

export async function updateAccount(id: string, updates: Partial<Account>) {
  const data = await apiFetch<{ account: Account }>(`/api/data/accounts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  return data?.account || null
}

export async function deleteAccount(id: string) {
  const data = await apiFetch<{ success: boolean }>(`/api/data/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return data?.success || false
}

