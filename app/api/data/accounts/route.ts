import { NextRequest, NextResponse } from 'next/server'
import { cacheKeys } from '@/lib/cache-keys'
import { invalidateUserAccountsCache } from '@/lib/cache-invalidation'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { cached } from '@/lib/server-cache'

export const GET = withAuth(async (_, user) => {
  const accounts = await cached({
    key: cacheKeys.userAccounts(user.id),
    ttlSeconds: 60,
    label: `accounts user=${user.id}`,
    fetcher: () =>
      prisma.account.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          userId: true,
          name: true,
          type: true,
          balance: true,
          currency: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
  })
  return successResponse({ accounts })
})

export const POST = withAuth(async (request: NextRequest, user): Promise<any> => {
  try {
    const body = await request.json()
    const { name, type, balance, currency } = body

    if (!name || typeof name !== 'string' || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const account = await prisma.account.create({
      data: {
        name,
        type,
        balance: balance || 0,
        currency: currency || 'USD',
        userId: user.id,
      },
    })

    await invalidateUserAccountsCache(user.id)
    return successResponse({ account }, 201)
  } catch (error) {
    console.error('Error creating account:', error)
    return errorResponse('Failed to create account', 500)
  }
})
