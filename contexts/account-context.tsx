"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
import type { Account } from "@/entities/account/api"
import { accountsQuery } from "@/lib/query-options"
import {
  ALL_ACCOUNTS_SCOPE,
  accountScopeKey,
  accountScopeToParam,
  normalizeAccountScope,
  type AccountScope,
} from "@/lib/accounts/account-scope"

const storageKey = "investment-dashboard:selected-account"

type AccountContextValue = {
  scope: AccountScope
  selectedAccount: Account | null
  accounts: Account[]
  isLoading: boolean
  setScope: (scope: AccountScope) => void
  setSelectedAccountId: (accountId: string) => void
  scopeKey: string
  accountIdParam: string
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? ""
  const [scope, setScopeState] = useState<AccountScope>(ALL_ACCOUNTS_SCOPE)
  const accountsResult = useQuery({ ...accountsQuery(userId), enabled: Boolean(user) })
  const accounts = accountsResult.data ?? []

  useEffect(() => {
    try {
      setScopeState(normalizeAccountScope(window.localStorage.getItem(storageKey)))
    } catch {
      setScopeState(ALL_ACCOUNTS_SCOPE)
    }
  }, [])

  useEffect(() => {
    if (scope.type !== "single") return
    if (accountsResult.isLoading) return
    if (!accounts.some((account) => account.id === scope.accountId)) {
      setScopeState(ALL_ACCOUNTS_SCOPE)
      try {
        window.localStorage.setItem(storageKey, "all")
      } catch {
        // Ignore storage errors.
      }
    }
  }, [accounts, accountsResult.isLoading, scope])

  const setScope = useCallback((nextScope: AccountScope) => {
    setScopeState(nextScope)
    try {
      window.localStorage.setItem(storageKey, accountScopeToParam(nextScope))
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const setSelectedAccountId = useCallback(
    (accountId: string) => {
      setScope(normalizeAccountScope(accountId))
    },
    [setScope],
  )

  const selectedAccount = scope.type === "single" ? accounts.find((account) => account.id === scope.accountId) ?? null : null

  const value = useMemo<AccountContextValue>(
    () => ({
      scope,
      selectedAccount,
      accounts,
      isLoading: accountsResult.isLoading,
      setScope,
      setSelectedAccountId,
      scopeKey: accountScopeKey(scope),
      accountIdParam: accountScopeToParam(scope),
    }),
    [accounts, accountsResult.isLoading, scope, selectedAccount, setScope, setSelectedAccountId],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccountContext() {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error("useAccountContext must be used within AccountProvider")
  }
  return context
}

