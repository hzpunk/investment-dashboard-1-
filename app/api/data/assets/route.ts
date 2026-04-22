import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

// GET /api/data/assets - List all assets (global)
export const GET = withAuth(async () => {
  const assets = await prisma.asset.findMany({
    orderBy: { symbol: 'asc' },
  })

  return successResponse(assets)
})

// POST /api/data/assets - Create new asset
export const POST = withAuth(async (request) => {
  const data = await request.json()
  
  const asset = await prisma.asset.create({
    data: {
      symbol: data.symbol,
      name: data.name,
      type: data.type || 'stock',
      currentPrice: data.current_price || 0,
      currency: data.currency || 'USD',
    },
  })

  return successResponse(asset)
})
