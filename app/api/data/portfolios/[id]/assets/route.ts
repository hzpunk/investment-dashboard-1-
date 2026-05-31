import { NextRequest, NextResponse } from "next/server"
import { invalidateUserPortfolioCache } from "@/lib/cache-invalidation"
import { prisma } from "@/lib/prisma"
import { withAuth, successResponse, errorResponse } from "@/lib/api-handler"

export const GET = withAuth(async (
  request: NextRequest,
  user,
  ctx
) => {
  const params = await ctx?.params
  const portfolioId = params?.id as string

  if (!portfolioId) {
    return errorResponse("Portfolio ID required", 400)
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
    include: {
      assets: {
        include: {
          asset: true,
        },
      },
    },
  })

  if (!portfolio) {
    return errorResponse("Portfolio not found", 404)
  }

  return successResponse({ assets: portfolio.assets })
})

export const POST = withAuth(async (
  request: NextRequest,
  user,
  ctx
) => {
  const params = await ctx?.params
  const portfolioId = params?.id as string

  if (!portfolioId) {
    return errorResponse("Portfolio ID required", 400)
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  })

  if (!portfolio) {
    return errorResponse("Portfolio not found", 404)
  }

  const body = await request.json()
  const { assetId, quantity, averageBuyPrice } = body

  if (!assetId || typeof quantity !== "number" || quantity <= 0) {
    return errorResponse("Invalid data: assetId and quantity required", 400)
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  })

  if (!asset) {
    return errorResponse("Asset not found", 404)
  }

  const portfolioAsset = await prisma.portfolioAsset.create({
    data: {
      portfolioId,
      assetId,
      quantity,
      averageBuyPrice: averageBuyPrice || asset.currentPrice,
    },
    include: {
      asset: true,
    },
  })

  await invalidateUserPortfolioCache(user.id, portfolioId)
  return successResponse({ portfolioAsset }, 201)
})

export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  ctx
) => {
  const params = await ctx?.params
  const portfolioId = params?.id as string
  const { searchParams } = new URL(request.url)
  const assetId = searchParams.get("assetId")

  if (!portfolioId || !assetId) {
    return errorResponse("Portfolio ID and asset ID required", 400)
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  })

  if (!portfolio) {
    return errorResponse("Portfolio not found", 404)
  }

  await prisma.portfolioAsset.delete({
    where: {
      portfolioId_assetId: {
        portfolioId,
        assetId,
      },
    },
  })

  await invalidateUserPortfolioCache(user.id, portfolioId)
  return successResponse({ success: true })
})
