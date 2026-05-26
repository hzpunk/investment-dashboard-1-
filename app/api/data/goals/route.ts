import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (_, user) => {
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  const formattedGoals = goals.map(goal => ({
    ...goal,
    createdAt: goal.createdAt.toISOString(),
    targetDate: goal.targetDate?.toISOString().split('T')[0] || null,
  }))
  return successResponse({ goals: formattedGoals })
})

export const POST = withAuth(async (request, user) => {
  const data = await request.json()

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      name: data.name,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    },
  })

  const formattedGoal = {
    ...goal,
    createdAt: goal.createdAt.toISOString(),
    targetDate: goal.targetDate?.toISOString().split('T')[0] || null,
  }

  return successResponse({ goal: formattedGoal })
})
