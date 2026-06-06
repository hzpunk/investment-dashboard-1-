import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse } from '@/lib/api-handler'
import { readAccountScopeFromSearchParams, resolveAccountScopeForUser } from "@/lib/accounts/account-scope.server"

export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam ?? '5') || 5, 1), 50)
  const accountScopeInput = readAccountScopeFromSearchParams(searchParams)
  const accountScope = await resolveAccountScopeForUser(user.id, accountScopeInput.type === "single" ? accountScopeInput.accountId : "all")

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id, ...accountScope.transactionWhere },
    orderBy: { date: 'desc' },
    take: limit,
    include: {
      account: { select: { name: true } },
      asset: { select: { symbol: true, name: true } },
    },
  })

  const transactions = txs.map((t: typeof txs[0]) => {
    return {
      ...t,
      accounts: t.account,
      assets: t.asset,
    }
  })

  return successResponse({ transactions })
})
