import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

export const PUT = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const data = await request.json()

  const asset = await prisma.asset.findUnique({
    where: { id },
  })

  if (!asset) {
    return errorResponse('Asset not found', 404)
  }

  const updatedAsset = await prisma.asset.update({
    where: { id },
    data: {
      symbol: data.symbol,
      name: data.name,
      type: data.type,
      currentPrice: data.currentPrice,
      currency: data.currency,
    },
  })

  const formattedAsset = {
    ...updatedAsset,
    updatedAt: updatedAsset.updatedAt.toISOString(),
  }

  return successResponse({ asset: formattedAsset })
})

export const DELETE = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
  })

  if (!asset) {
    return errorResponse('Asset not found', 404)
  }

  await prisma.asset.delete({ where: { id } })
  return successResponse({ success: true })
})
