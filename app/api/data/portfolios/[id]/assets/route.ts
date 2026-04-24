import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/api-handler"

// GET /api/data/portfolios/[id]/assets - Get portfolio assets
export const GET = withAuth(async (
  request: NextRequest,
  user
) => {
  try {
    const url = new URL(request.url)
    const portfolioId = url.pathname.split("/")[4]

    // Check portfolio ownership
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
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 })
    }

    return NextResponse.json({ assets: portfolio.assets })
  } catch (error) {
    console.error("Error fetching portfolio assets:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio assets" },
      { status: 500 }
    )
  }
})

// POST /api/data/portfolios/[id]/assets - Add asset to portfolio
export const POST = withAuth(async (
  request: NextRequest,
  user
) => {
  try {
    const url = new URL(request.url)
    const portfolioId = url.pathname.split("/")[4]

    // Check portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: user.id },
    })

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 })
    }

    const body = await request.json()
    const { assetId, quantity, averageBuyPrice } = body

    if (!assetId || typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Invalid data: assetId and quantity required" },
        { status: 400 }
      )
    }

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Create portfolio asset
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

    return NextResponse.json({ portfolioAsset }, { status: 201 })
  } catch (error) {
    console.error("Error adding asset to portfolio:", error)
    return NextResponse.json(
      { error: "Failed to add asset to portfolio" },
      { status: 500 }
    )
  }
})

// DELETE /api/data/portfolios/[id]/assets?assetId=xxx - Remove asset from portfolio
export const DELETE = withAuth(async (
  request: NextRequest,
  user
) => {
  try {
    const url = new URL(request.url)
    const portfolioId = url.pathname.split("/")[4]
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get("assetId")

    if (!assetId) {
      return NextResponse.json(
        { error: "assetId query parameter required" },
        { status: 400 }
      )
    }

    // Check portfolio ownership
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: user.id },
    })

    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 })
    }

    // Delete portfolio asset
    await prisma.portfolioAsset.delete({
      where: {
        portfolioId_assetId: {
          portfolioId,
          assetId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing asset from portfolio:", error)
    return NextResponse.json(
      { error: "Failed to remove asset from portfolio" },
      { status: 500 }
    )
  }
})
