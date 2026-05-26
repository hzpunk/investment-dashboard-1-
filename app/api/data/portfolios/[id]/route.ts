import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: {
      assets: {
        include: {
          asset: true,
        },
      },
    },
  })

  if (!portfolio) {
    return errorResponse('Portfolio not found', 404)
  }

  const portfolioWithFormattedAssets = {
    ...portfolio,
    createdAt: portfolio.createdAt.toISOString(),
    assets: portfolio.assets.map(pa => ({
      portfolioId: pa.portfolioId,
      assetId: pa.assetId,
      quantity: pa.quantity,
      averageBuyPrice: pa.averageBuyPrice,
      asset: {
        ...pa.asset,
        currentPrice: pa.asset.currentPrice,
        updatedAt: pa.asset.updatedAt.toISOString(),
      },
    })),
  }

  return successResponse({ portfolio: portfolioWithFormattedAssets })
})

export const PUT = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const body = await request.json()

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
  })

  if (!portfolio) {
    return errorResponse('Portfolio not found', 404)
  }

  const updatedPortfolio = await prisma.portfolio.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
    },
  })

  return successResponse({ portfolio: updatedPortfolio })
})

export const DELETE = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
  })

  if (!portfolio) {
    return errorResponse('Portfolio not found', 404)
  }

  await prisma.portfolio.delete({ where: { id } })
  return successResponse({ success: true })
})
