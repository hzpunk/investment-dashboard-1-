import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (_, user) => {
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
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

    return successResponse({ account }, 201)
  } catch (error) {
    console.error('Error creating account:', error)
    return errorResponse('Failed to create account', 500)
  }
})
