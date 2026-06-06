export type AccountScope = { type: "all" } | { type: "single"; accountId: string }

export const ALL_ACCOUNTS_SCOPE: AccountScope = { type: "all" }
export const allAccountsValue = "all"

export function normalizeAccountScope(value: unknown): AccountScope {
  if (typeof value !== "string") return ALL_ACCOUNTS_SCOPE
  const trimmed = value.trim()
  if (!trimmed || trimmed === allAccountsValue) return ALL_ACCOUNTS_SCOPE
  return { type: "single", accountId: trimmed }
}

export function accountScopeToParam(scope: AccountScope): string {
  return scope.type === "single" ? scope.accountId : allAccountsValue
}

export function accountScopeKey(scope: AccountScope): string {
  return scope.type === "single" ? `account:${scope.accountId}` : allAccountsValue
}

export function accountScopeLabel(scope: AccountScope, accounts: Array<{ id: string; name: string }>, allLabel: string) {
  if (scope.type === "all") return allLabel
  return accounts.find((account) => account.id === scope.accountId)?.name ?? allLabel
}

export function appendAccountScope(query: URLSearchParams, scope: AccountScope) {
  if (scope.type === "single") query.set("accountId", scope.accountId)
}

