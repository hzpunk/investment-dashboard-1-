import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { getHistoricalPrices } from '@/shared/api/market-data'
import { subDays, subMonths, subYears, startOfDay } from 'date-fns'

export const GET = withAuth(async (_request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string

  if (!id) {
    return errorResponse('Portfolio ID required', 400)
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

  let totalValue = 0
  const assetsByType: Record<string, { type: string; value: number }> = {}

  for (const item of portfolio.assets) {
    const asset = item.asset
    const value = item.quantity * asset.currentPrice
    totalValue += value

    if (!assetsByType[asset.type]) {
      assetsByType[asset.type] = { type: asset.type, value: 0 }
    }
    assetsByType[asset.type].value += value
  }

  return successResponse({
    totalValue,
    assetCount: portfolio.assets.length,
    allocation: Object.values(assetsByType),
  })
})
