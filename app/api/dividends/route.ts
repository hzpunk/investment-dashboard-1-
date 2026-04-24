import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"

// GET /api/dividends - get dividend history and projections
export async function GET(request: Request) {
  try {
    const user = await requireRequestUser()
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || new Date().getFullYear().toString()
    // Get dividend transactions
    const dividends = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: "dividend",
        date: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${parseInt(year) + 1}-01-01`),
        },
      },
      include: {
        asset: true,
        account: true,
      },
      orderBy: { date: "desc" },
    })

    // Get holdings to calculate yield
    const holdings = await prisma.portfolio.findMany({
      where: { userId: user.id },
      include: {
        assets: {
          include: {
            asset: true,
          },
        },
      },
    })

    // Calculate dividend metrics
    const totalDividends = dividends.reduce((sum: number, d: typeof dividends[0]) => sum + d.totalAmount, 0)
    
    // Group by asset
    const byAsset: Record<string, { symbol: string; name: string; total: number; count: number }> = {}
    for (const d of dividends) {
      if (!d.asset) continue
      const key = d.assetId
      if (!byAsset[key]) {
        byAsset[key] = {
          symbol: d.asset.symbol,
          name: d.asset.name,
          total: 0,
          count: 0,
        }
      }
      byAsset[key].total += d.totalAmount
      byAsset[key].count++
    }

    // Group by month
    const byMonth: Record<string, number> = {}
    for (let i = 1; i <= 12; i++) {
      byMonth[i.toString().padStart(2, "0")] = 0
    }
    for (const d of dividends) {
      const month = d.date.getMonth() + 1
      const key = month.toString().padStart(2, "0")
      byMonth[key] = (byMonth[key] || 0) + d.totalAmount
    }

    // Calculate portfolio value for yield
    const portfolioValue = holdings.reduce((sum: number, p: typeof holdings[0]) => {
      return sum + p.assets.reduce((aSum: number, pa: typeof p.assets[0]) => {
        return aSum + pa.quantity * pa.asset.currentPrice
      }, 0)
    }, 0)

    const dividendYield = portfolioValue > 0 ? (totalDividends / portfolioValue) * 100 : 0

    // Monthly average
    const monthsWithDividends = Object.values(byMonth).filter((v) => v > 0).length
    const monthlyAverage = monthsWithDividends > 0 ? totalDividends / monthsWithDividends : 0

    return NextResponse.json({
      year: parseInt(year),
      summary: {
        totalDividends,
        dividendYield,
        monthlyAverage,
        transactionCount: dividends.length,
        portfolioValue,
      },
      byAsset: Object.values(byAsset).sort((a: any, b: any) => b.total - a.total),
      byMonth,
      recentDividends: dividends.slice(0, 10).map((d: typeof dividends[0]) => ({
        id: d.id,
        date: d.date,
        symbol: d.asset?.symbol,
        name: d.asset?.name,
        amount: d.totalAmount,
        currency: d.currency,
        account: d.account?.name,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dividends" },
      { status: 500 }
    )
  }
}

// POST /api/dividends - record a dividend payment
export async function POST(request: Request) {
  try {
    const user = await requireRequestUser()
    const body = await request.json()
    const { 
      assetId, 
      accountId, 
      amount, 
      date, 
      currency = "USD",
      notes 
    } = body

    if (!assetId || !amount) {
      return NextResponse.json(
        { error: "Missing assetId or amount" },
        { status: 400 }
      )
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    })

    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      )
    }

    // Find default account if not provided
    let finalAccountId = accountId
    if (!finalAccountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { userId: user.id },
      })
      if (!defaultAccount) {
        return NextResponse.json(
          { error: "No account found" },
          { status: 400 }
        )
      }
      finalAccountId = defaultAccount.id
    }

    // Create dividend transaction
    const dividend = await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: finalAccountId,
        assetId,
        type: "dividend",
        totalAmount: amount,
        currency,
        date: date ? new Date(date) : new Date(),
        notes: notes || `Dividend from ${asset.symbol}`,
      },
      include: {
        asset: true,
        account: true,
      },
    })

    // Update account balance
    await prisma.account.update({
      where: { id: finalAccountId },
      data: {
        balance: {
          increment: amount,
        },
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Dividend Received",
        message: `Received $${amount.toFixed(2)} dividend from ${asset.symbol}`,
        type: "dividend",
        metadata: {
          transactionId: dividend.id,
          assetId,
          amount,
        },
      },
    })

    // Log activity
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DIVIDEND_RECORD",
        entityType: "transaction",
        entityId: dividend.id,
        details: {
          assetId,
          amount,
          symbol: asset.symbol,
        },
      },
    })

    return NextResponse.json({ dividend })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to record dividend" },
      { status: 500 }
    )
  }
}
