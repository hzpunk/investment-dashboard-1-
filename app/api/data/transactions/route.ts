import { NextRequest, NextResponse } from 'next/server'
import { withAuth, errorResponse, successResponse, parsePagination } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

// GET /api/data/transactions - List user transactions
export const GET = withAuth(async (request, user) => {
  const { limit } = parsePagination(new URL(request.url).searchParams)

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: {
      account: { select: { id: true, name: true } },
      asset: { select: { id: true, symbol: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })

  // Format to match expected shape
  const formatted = transactions.map((t: typeof transactions[0]) => ({
    ...t,
    accounts: t.account,
    assets: t.asset,
  }))

  return successResponse(formatted)
})

// POST /api/data/transactions - Create new transaction
export const POST = withAuth(async (request, user) => {
  const data = await request.json()

  // Validate required fields
  if (!data.account_id || !data.type || data.total_amount === undefined) {
    return errorResponse('Missing required fields: account_id, type, total_amount', 400)
  }

  // Atomic transaction to ensure data consistency
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: data.account_id,
        assetId: data.asset_id,
        type: data.type,
        quantity: data.quantity,
        pricePerUnit: data.price_per_unit,
        totalAmount: data.total_amount,
        fee: data.fee || 0,
        currency: data.currency || 'USD',
        date: new Date(data.date || Date.now()),
        notes: data.notes,
      },
      include: {
        account: { select: { id: true, name: true } },
        asset: { select: { id: true, symbol: true, name: true } },
      },
    }),
    // Update account balance atomically
    prisma.account.update({
      where: { id: data.account_id },
      data: {
        balance: {
          ...(data.type === 'buy' || data.type === 'withdrawal'
            ? { decrement: data.total_amount + (data.fee || 0) }
            : data.type === 'sell' || data.type === 'deposit' || data.type === 'dividend' || data.type === 'interest'
            ? { increment: data.total_amount - (data.fee || 0) }
            : {})
        }
      },
    })
  ])

  return successResponse({
    ...transaction,
    accounts: transaction.account,
    assets: transaction.asset,
  })
})
