import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse } from '@/lib/api-handler'

export const GET = withAuth(async (_, user) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return successResponse({ portfolios })
})
