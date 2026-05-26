import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!goal) {
    return errorResponse('Goal not found', 404)
  }

  const formattedGoal = {
    ...goal,
    createdAt: goal.createdAt.toISOString(),
    targetDate: goal.targetDate?.toISOString().split('T')[0] || null,
  }

  return successResponse({ goal: formattedGoal })
})

export const PUT = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const body = await request.json()
  console.log("PUT /goals/[id] body:", body)

  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!goal) {
    return errorResponse('Goal not found', 404)
  }

  const updatedGoal = await prisma.goal.update({
    where: { id },
    data: {
      name: body.name,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
    },
  })

  console.log("PUT /goals/[id] updatedGoal:", updatedGoal)

  const formattedGoal = {
    ...updatedGoal,
    createdAt: updatedGoal.createdAt.toISOString(),
    targetDate: updatedGoal.targetDate?.toISOString().split('T')[0] || null,
  }

  return successResponse({ goal: formattedGoal })
})

export const DELETE = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const goal = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  })

  if (!goal) {
    return errorResponse('Goal not found', 404)
  }

  await prisma.goal.delete({ where: { id } })
  return successResponse({ success: true })
})
