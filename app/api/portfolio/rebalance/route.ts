import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"

// POST /api/portfolio/rebalance - calculate rebalancing recommendations
export async function POST(request: Request) {
  const user = await requireRequestUser()
  
  try {
    const body = await request.json()
    const { portfolioId, targetAllocation, strategy = "threshold" } = body

    if (!portfolioId || !targetAllocation || !Array.isArray(targetAllocation)) {
      return NextResponse.json(
        { error: "Missing portfolioId or targetAllocation" },
        { status: 400 }
      )
    }

    // Get portfolio with current assets
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
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      )
    }

    // Calculate current values
    const currentAllocation = portfolio.assets.map((pa: typeof portfolio.assets[0]) => ({
      assetId: pa.assetId,
      symbol: pa.asset.symbol,
      name: pa.asset.name,
      quantity: pa.quantity,
      currentPrice: pa.asset.currentPrice,
      value: pa.quantity * pa.asset.currentPrice,
    }))

    const totalValue = currentAllocation.reduce((sum: number, a: typeof currentAllocation[0]) => sum + a.value, 0)

    // Calculate current percentages
    const currentWithPct = currentAllocation.map((a: typeof currentAllocation[0]) => ({
      ...a,
      currentPercent: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
    }))

    // Calculate target values and trades needed
    const rebalancing = targetAllocation.map((target: any) => {
      const current = currentWithPct.find((c: typeof currentWithPct[0]) => c.assetId === target.assetId)
      const currentValue = current?.value || 0
      const currentQty = current?.quantity || 0
      const currentPrice = current?.currentPrice || target.currentPrice || 0
      
      const targetValue = (target.targetPercent / 100) * totalValue
      const valueDiff = targetValue - currentValue
      const quantityDiff = currentPrice > 0 ? valueDiff / currentPrice : 0
      
      return {
        assetId: target.assetId,
        symbol: target.symbol || current?.symbol || "Unknown",
        name: target.name || current?.name || "Unknown",
        currentPercent: current?.currentPercent || 0,
        targetPercent: target.targetPercent,
        currentValue,
        targetValue,
        valueDiff,
        currentQty,
        targetQty: currentQty + quantityDiff,
        quantityDiff,
        action: quantityDiff > 0 ? "buy" : quantityDiff < 0 ? "sell" : "hold",
      }
    })

    // Calculate total trades needed
    const tradesNeeded = rebalancing.filter((r: any) => r.action !== "hold")
    const totalBuyValue = rebalancing
      .filter((r: any) => r.action === "buy")
      .reduce((sum: number, r: any) => sum + r.valueDiff, 0)
    const totalSellValue = rebalancing
      .filter((r: any) => r.action === "sell")
      .reduce((sum: number, r: any) => sum + Math.abs(r.valueDiff), 0)

    // Check if rebalancing is needed based on strategy
    const needsRebalancing = strategy === "threshold" 
      ? rebalancing.some((r: any) => Math.abs(r.currentPercent - r.targetPercent) > 5)
      : tradesNeeded.length > 0

    // Log rebalance check
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REBALANCE_CALC",
        entityType: "portfolio",
        entityId: portfolioId,
        details: {
          strategy,
          totalValue,
          tradesNeeded: tradesNeeded.length,
          needsRebalancing,
        },
      },
    })

    return NextResponse.json({
      portfolioId,
      portfolioName: portfolio.name,
      totalValue,
      strategy,
      needsRebalancing,
      currentAllocation: currentWithPct,
      targetAllocation: rebalancing,
      summary: {
        tradesNeeded: tradesNeeded.length,
        totalBuyValue,
        totalSellValue,
        estimatedFees: (totalBuyValue + totalSellValue) * 0.001, // 0.1% estimate
      },
    })
  } catch (error) {
    console.error("Rebalance error:", error)
    return NextResponse.json(
      { error: "Failed to calculate rebalancing" },
      { status: 500 }
    )
  }
}

// GET /api/portfolio/rebalance/strategies - get available strategies
export async function GET() {
  const strategies = [
    {
      id: "threshold",
      name: "Threshold Rebalancing",
      description: "Rebalance when allocation deviates by more than 5% from target",
      params: {
        threshold: {
          type: "number",
          default: 5,
          min: 1,
          max: 20,
          unit: "%",
        },
      },
    },
    {
      id: "calendar",
      name: "Calendar Rebalancing",
      description: "Rebalance on a fixed schedule (monthly, quarterly, annually)",
      params: {
        frequency: {
          type: "string",
          default: "quarterly",
          options: ["monthly", "quarterly", "annually"],
        },
      },
    },
    {
      id: "cash_flow",
      name: "Cash Flow Rebalancing",
      description: "Rebalance only with new contributions or withdrawals",
      params: {
        minContribution: {
          type: "number",
          default: 1000,
          min: 100,
          unit: "USD",
        },
      },
    },
    {
      id: "tolerance",
      name: "Tolerance Band Rebalancing",
      description: "Rebalance when allocation drifts outside tolerance bands",
      params: {
        absoluteTolerance: {
          type: "number",
          default: 10,
          min: 5,
          max: 25,
          unit: "%",
        },
        relativeTolerance: {
          type: "number",
          default: 20,
          min: 10,
          max: 50,
          unit: "%",
        },
      },
    },
  ]

  return NextResponse.json({ strategies })
}
