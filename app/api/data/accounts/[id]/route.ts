import { NextRequest, NextResponse } from 'next/server'
import { invalidateUserAccountsCache } from '@/lib/cache-invalidation'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (request: NextRequest, user) => {
  const id = request.nextUrl.pathname.split('/').pop()
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!account) {
    return errorResponse('Account not found', 404)
  }

  return successResponse({ account })
})

export const PUT = withAuth(async (request: NextRequest, user) => {
  const id = request.nextUrl.pathname.split('/').pop()
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const body = await request.json()

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!account) {
    return errorResponse('Account not found', 404)
  }

  const updatedAccount = await prisma.account.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      balance: body.balance,
      currency: body.currency,
    },
  })

  await invalidateUserAccountsCache(user.id)
  return successResponse({ account: updatedAccount })
})

export const DELETE = withAuth(async (request: NextRequest, user) => {
  const id = request.nextUrl.pathname.split('/').pop()
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!account) {
    return errorResponse('Account not found', 404)
  }

  await prisma.account.delete({ where: { id } })
  await invalidateUserAccountsCache(user.id)
  return successResponse({ success: true })
})
