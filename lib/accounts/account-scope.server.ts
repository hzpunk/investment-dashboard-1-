import "server-only"

import { prisma } from "@/lib/prisma"
import { ApiErrorCode } from "@/lib/api-errors"
import { normalizeAccountScope, type AccountScope } from "@/lib/accounts/account-scope"

export class AccountScopeError extends Error {
  status = 404
  statusCode = 404
  code = ApiErrorCode.ACCOUNT_NOT_FOUND

  constructor(message = "Account not found") {
    super(message)
    this.name = "AccountScopeError"
  }
}

export type ResolvedAccountScope =
  | {
      type: "all"
      accountId: null
      account: null
      transactionWhere: {}
      accountWhere: {}
    }
  | {
      type: "single"
      accountId: string
      account: {
        id: string
        name: string
        type: string
        balance: number
        currency: string
      }
      transactionWhere: { accountId: string }
      accountWhere: { id: string }
    }

export function readAccountScopeFromSearchParams(searchParams: URLSearchParams): AccountScope {
  return normalizeAccountScope(searchParams.get("accountId"))
}

export async function resolveAccountScopeForUser(userId: string, input: unknown): Promise<ResolvedAccountScope> {
  const scope = normalizeAccountScope(input)
  if (scope.type === "all") {
    return {
      type: "all",
      accountId: null,
      account: null,
      transactionWhere: {},
      accountWhere: {},
    }
  }

  const account = await prisma.account.findFirst({
    where: { id: scope.accountId, userId },
    select: { id: true, name: true, type: true, balance: true, currency: true },
  })

  if (!account) {
    throw new AccountScopeError()
  }

  return {
    type: "single",
    accountId: account.id,
    account,
    transactionWhere: { accountId: account.id },
    accountWhere: { id: account.id },
  }
}

export function accountScopeCachePart(scope: AccountScope | ResolvedAccountScope) {
  return scope.type === "single" ? `account:${scope.accountId}` : "all"
}
