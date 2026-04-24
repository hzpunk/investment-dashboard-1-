import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"

// GET /api/analytics - portfolio analytics and metrics
// Query params: from, to (ISO dates), portfolioId (optional)
export async function GET(request: Request) {
  try {
    const user = await requireRequestUser()
    const { searchParams } = new URL(request.url)
    
    // Parse date range
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const portfolioId = searchParams.get('portfolioId')
    
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    
    const fromDate = fromParam ? new Date(fromParam) : defaultFrom
    const toDate = toParam ? new Date(toParam) : now
    
    // Validate dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    
    if (fromDate > toDate) {
      return NextResponse.json({ error: 'From date must be before to date' }, { status: 400 })
    }
    
    // Max range: 5 years
    const maxRange = 5 * 365 * 24 * 60 * 60 * 1000
    if (toDate.getTime() - fromDate.getTime() > maxRange) {
      return NextResponse.json({ error: 'Date range too large (max 5 years)' }, { status: 400 })
    }

    // Build where clause
    const where: any = {
      userId: user.id,
      date: { gte: fromDate, lte: toDate },
    }
    
    if (portfolioId) {
      where.portfolioId = portfolioId
    }

    // Get user's transactions for the period
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        quantity: true,
        totalAmount: true,
        date: true,
        assetId: true,
        accountId: true,
        asset: { select: { symbol: true, currentPrice: true } },
        account: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 1000,
    })

    // Get all user's accounts (usually small number)
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true, balance: true, currency: true },
    })

    // Get user's portfolios with assets (last 100)
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        assets: {
          select: {
            quantity: true,
            averageBuyPrice: true,
            asset: { select: { symbol: true, currentPrice: true, type: true } },
          },
        },
      },
      take: 100,
    })

    // Calculate metrics
    const analytics = calculateAnalytics(transactions, accounts, portfolios, fromDate, toDate)

    return NextResponse.json({
      ...analytics,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to calculate analytics" },
      { status: 500 }
    )
  }
}

function calculateAnalytics(
  transactions: any[],
  accounts: any[],
  portfolios: any[],
  fromDate: Date,
  toDate: Date
) {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

  // Total portfolio value
  const totalValue = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  // Calculate total invested (buy transactions)
  const buyTransactions = transactions.filter((t) => t.type === "buy")
  const totalInvested = buyTransactions.reduce((sum, t) => sum + t.totalAmount, 0)

  // Calculate total proceeds (sell transactions)
  const sellTransactions = transactions.filter((t) => t.type === "sell")
  const totalProceeds = sellTransactions.reduce((sum, t) => sum + t.totalAmount, 0)

  // Realized P&L
  const realizedPnL = totalProceeds - buyTransactions
    .filter((t) => sellTransactions.some((s) => s.assetId === t.assetId))
    .reduce((sum, t) => sum + t.totalAmount, 0)

  // Unrealized P&L (current value - invested in holdings)
  const holdings: Record<string, { quantity: number; invested: number }> = {}
  
  for (const t of transactions) {
    if (!t.assetId) continue
    
    if (!holdings[t.assetId]) {
      holdings[t.assetId] = { quantity: 0, invested: 0 }
    }
    
    if (t.type === "buy") {
      holdings[t.assetId].quantity += t.quantity || 0
      holdings[t.assetId].invested += t.totalAmount
    } else if (t.type === "sell") {
      const ratio = holdings[t.assetId].quantity > 0
        ? (t.quantity || 0) / holdings[t.assetId].quantity
        : 0
      holdings[t.assetId].invested *= (1 - ratio)
      holdings[t.assetId].quantity -= t.quantity || 0
    }
  }

  // Calculate returns by time period
  const transactionsLastYear = transactions.filter((t) => t.date >= oneYearAgo)
  const transactionsLastMonth = transactions.filter(
    (t) => t.date >= new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  )

  // Performance metrics
  const returns = {
    total: totalValue - totalInvested + totalProceeds,
    totalPercent: totalInvested > 0 
      ? ((totalValue - totalInvested + totalProceeds) / totalInvested) * 100 
      : 0,
    realized: realizedPnL,
    unrealized: 0, // Would need current prices
  }

  // Asset allocation
  const allocation = portfolios.flatMap((p) =>
    p.assets.map((pa: any) => ({
      asset: pa.asset.symbol,
      name: pa.asset.name,
      type: pa.asset.type,
      quantity: pa.quantity,
      value: pa.quantity * pa.asset.currentPrice,
    }))
  )

  const totalAllocationValue = allocation.reduce((sum, a) => sum + a.value, 0)
  
  const allocationPercent = allocation.map((a) => ({
    ...a,
    percent: totalAllocationValue > 0 ? (a.value / totalAllocationValue) * 100 : 0,
  }))

  // Transaction statistics for the selected period
  const transactionStats = {
    total: transactions.length,
    buy: transactions.filter((t) => t.type === "buy").length,
    sell: transactions.filter((t) => t.type === "sell").length,
    dividend: transactions.filter((t) => t.type === "dividend").length,
    periodStart: fromDate.toISOString(),
    periodEnd: toDate.toISOString(),
  }

  // Monthly performance (simplified)
  const monthlyData: Record<string, { invested: number; value: number }> = {}
  
  for (const t of transactions) {
    const monthKey = t.date.toISOString().slice(0, 7) // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { invested: 0, value: 0 }
    }
    
    if (t.type === "buy") {
      monthlyData[monthKey].invested += t.totalAmount
    }
  }

  const monthlyPerformance = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      invested: data.invested,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    summary: {
      totalValue,
      totalInvested,
      returns,
      accountsCount: accounts.length,
      portfoliosCount: portfolios.length,
    },
    allocation: allocationPercent,
    transactionStats,
    monthlyPerformance,
    topHoldings: allocationPercent
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  }
}
