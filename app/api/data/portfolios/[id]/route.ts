import { NextRequest, NextResponse } from 'next/server'
import { cacheKeys } from '@/lib/cache-keys'
import { invalidateUserPortfolioCache } from '@/lib/cache-invalidation'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { cached } from '@/lib/server-cache'

export const GET = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const portfolioWithFormattedAssets = await cached({
    key: cacheKeys.userPortfolio(user.id, id),
    ttlSeconds: 120,
    label: `portfolio user=${user.id}`,
    fetcher: async () => {
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

      if (!portfolio) return null

      return {
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
    },
  })

  if (!portfolioWithFormattedAssets) {
    return errorResponse('Portfolio not found', 404)
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

  await invalidateUserPortfolioCache(user.id, id)
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
  await invalidateUserPortfolioCache(user.id, id)
  return successResponse({ success: true })
})
