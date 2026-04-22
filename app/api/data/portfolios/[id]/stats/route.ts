import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'

export const GET = withAuth(async (_request: NextRequest, user: { id: string; email: string }, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params

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
    return errorResponse('Not found', 404)
  }

  // Calculate portfolio statistics
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
