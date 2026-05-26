import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async () => {
  const assets = await prisma.asset.findMany({
    orderBy: { symbol: 'asc' },
  })

  const formattedAssets = assets.map(asset => ({
    ...asset,
    updatedAt: asset.updatedAt.toISOString(),
  }))

  return successResponse({ assets: formattedAssets })
})

export const POST = withAuth(async (request) => {
  const data = await request.json()
  
  const asset = await prisma.asset.create({
    data: {
      symbol: data.symbol,
      name: data.name,
      type: data.type || 'stock',
      currentPrice: data.currentPrice || 0,
      currency: data.currency || 'USD',
    },
  })

  const formattedAsset = {
    ...asset,
    updatedAt: asset.updatedAt.toISOString(),
  }

  return successResponse({ asset: formattedAsset })
})
