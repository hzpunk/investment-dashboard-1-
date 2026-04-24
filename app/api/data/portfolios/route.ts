import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse } from '@/lib/api-handler'

export const GET = withAuth(async (_, user) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return successResponse({ portfolios })
})

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { name, description, strategy } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        description: description || null,
        strategy: strategy || null,
        userId: user.id,
      },
    })

    return successResponse({ portfolio }, 201)
  } catch (error) {
    console.error('Error creating portfolio:', error)
    return NextResponse.json({ error: 'Failed to create portfolio' }, { status: 500 })
  }
})
