import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"

// GET /api/analytics - portfolio analytics and metrics
export async function GET() {
  try {
    const user = await requireRequestUser()
    // Get all user's transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        asset: true,
        account: true,
      },
      orderBy: { date: "asc" },
    })

    // Get all user's accounts
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
    })

    // Get user's portfolios with assets
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.id },
      include: {
        assets: {
          include: {
            asset: true,
          },
        },
      },
    })

    // Calculate metrics
    const analytics = calculateAnalytics(transactions, accounts, portfolios)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Failed to calculate analytics" },
      { status: 500 }
    )
  }
}

function calculateAnalytics(
  transactions: any[],
  accounts: any[],
  portfolios: any[]
) {
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

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
      const ratio = (t.quantity || 0) / holdings[t.assetId].quantity
      holdings[t.assetId].invested *= (1 - ratio)
      holdings[t.assetId].quantity -= t.quantity || 0
    }
  }

  // Calculate returns by time period
  const transactionsLastYear = transactions.filter((t) => t.date >= oneYearAgo)
  const transactionsLastMonth = transactions.filter(
    (t) => t.date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
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

  // Transaction statistics
  const transactionStats = {
    total: transactions.length,
    buy: transactions.filter((t) => t.type === "buy").length,
    sell: transactions.filter((t) => t.type === "sell").length,
    dividend: transactions.filter((t) => t.type === "dividend").length,
    lastMonth: transactionsLastMonth.length,
    lastYear: transactionsLastYear.length,
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
