import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (_, user) => {
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return successResponse({ goals })
})

// POST /api/data/goals - Create new goal
export const POST = withAuth(async (request, user) => {
  const data = await request.json()

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      name: data.name,
      targetAmount: data.target_amount,
      currentAmount: data.current_amount || 0,
      targetDate: data.target_date ? new Date(data.target_date) : null,
    },
  })

  return successResponse(goal)
})

// DELETE /api/data/goals?id=xxx - Delete goal
export const DELETE = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return errorResponse('ID required', 400)
  }

  // Verify goal belongs to user
  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!goal) {
    return errorResponse('Goal not found', 404)
  }

  await prisma.goal.delete({ where: { id } })
  return successResponse({ success: true })
})
