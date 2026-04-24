import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"

// GET /api/export/transactions - export transactions as CSV
export async function GET(request: Request) {
  const user = await requireRequestUser()
  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "csv"
  const type = searchParams.get("type") || "transactions"

  try {
    let data: string
    let filename: string
    let contentType: string

    switch (type) {
      case "transactions":
        const result = await exportTransactions(user.id, format)
        data = result.data
        filename = result.filename
        contentType = result.contentType
        break
      case "portfolio":
        const portfolioResult = await exportPortfolio(user.id, format)
        data = portfolioResult.data
        filename = portfolioResult.filename
        contentType = portfolioResult.contentType
        break
      case "tax-report":
        const taxResult = await exportTaxReport(user.id, format)
        data = taxResult.data
        filename = taxResult.filename
        contentType = taxResult.contentType
        break
      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        )
    }

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    )
  }
}

async function exportTransactions(userId: string, format: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: {
      asset: true,
      account: true,
    },
    orderBy: { date: "desc" },
  })

  if (format === "csv") {
    const headers = [
      "Date",
      "Type",
      "Symbol",
      "Asset Name",
      "Quantity",
      "Price Per Unit",
      "Total Amount",
      "Fee",
      "Currency",
      "Account",
      "Notes",
    ].join(",")

    const rows = transactions.map((t: typeof transactions[0]) =>
      [
        t.date.toISOString().split("T")[0],
        t.type,
        t.asset?.symbol || "",
        t.asset?.name || "",
        t.quantity || "",
        t.pricePerUnit || "",
        t.totalAmount,
        t.fee,
        t.currency,
        t.account.name,
        t.notes || "",
      ].map((v: string) => `"${v}"`).join(",")
    )

    return {
      data: [headers, ...rows].join("\n"),
      filename: `transactions_${new Date().toISOString().split("T")[0]}.csv`,
      contentType: "text/csv",
    }
  }

  // JSON format
  return {
    data: JSON.stringify(transactions, null, 2),
    filename: `transactions_${new Date().toISOString().split("T")[0]}.json`,
    contentType: "application/json",
  }
}

async function exportPortfolio(userId: string, format: string) {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: {
      assets: {
        include: {
          asset: true,
        },
      },
    },
  })

  const accounts = await prisma.account.findMany({
    where: { userId },
  })

  const data = {
    exportDate: new Date().toISOString(),
    accounts: accounts.map((a: typeof accounts[0]) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
      currency: a.currency,
    })),
    portfolios: portfolios.map((p: typeof portfolios[0]) => ({
      name: p.name,
      description: p.description,
      assets: p.assets.map((pa: typeof p.assets[0]) => ({
        symbol: pa.asset.symbol,
        name: pa.asset.name,
        type: pa.asset.type,
        quantity: pa.quantity,
        averageBuyPrice: pa.averageBuyPrice,
        currentPrice: pa.asset.currentPrice,
        value: pa.quantity * pa.asset.currentPrice,
      })),
    })),
  }

  if (format === "csv") {
    const rows: string[] = []
    rows.push("Portfolio Export")
    rows.push(`Export Date,${data.exportDate}`)
    rows.push("")
    rows.push("Accounts")
    rows.push("Name,Type,Balance,Currency")
    for (const acc of data.accounts) {
      rows.push(`${acc.name},${acc.type},${acc.balance},${acc.currency}`)
    }
    rows.push("")
    rows.push("Portfolios")
    for (const p of data.portfolios as any[]) {
      rows.push(`Portfolio: ${p.name}`)
      rows.push("Symbol,Name,Type,Quantity,Avg Price,Current Price,Value")
      for (const a of p.assets as any[]) {
        rows.push(
          `${a.symbol},${a.name},${a.type},${a.quantity},${a.averageBuyPrice},${a.currentPrice},${a.value}`
        )
      }
      rows.push("")
    }

    return {
      data: rows.join("\n"),
      filename: `portfolio_${new Date().toISOString().split("T")[0]}.csv`,
      contentType: "text/csv",
    }
  }

  return {
    data: JSON.stringify(data, null, 2),
    filename: `portfolio_${new Date().toISOString().split("T")[0]}.json`,
    contentType: "application/json",
  }
}

async function exportTaxReport(userId: string, format: string) {
  const year = new Date().getFullYear()
  
  // Get sell transactions for tax calculation
  const sellTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "sell",
      date: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    include: {
      asset: true,
    },
    orderBy: { date: "asc" },
  })

  // Get matching buy transactions (FIFO method)
  const buyTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "buy",
    },
    include: {
      asset: true,
    },
    orderBy: { date: "asc" },
  })

  // Calculate gains/losses
  const taxItems = sellTransactions.map((sell: typeof sellTransactions[0]) => {
    const assetBuys = buyTransactions.filter(
      (b: typeof buyTransactions[0]) => b.assetId === sell.assetId && b.date <= sell.date
    )
    
    // Simplified: use average cost basis
    const avgCost =
      assetBuys.length > 0
        ? assetBuys.reduce((sum: number, b: typeof buyTransactions[0]) => sum + b.totalAmount, 0) /
          assetBuys.reduce((sum: number, b: typeof buyTransactions[0]) => sum + (b.quantity || 0), 0)
        : 0

    const costBasis = (sell.quantity || 0) * avgCost
    const proceeds = sell.totalAmount
    const gain = proceeds - costBasis

    return {
      date: sell.date,
      symbol: sell.asset?.symbol || "",
      assetName: sell.asset?.name || "",
      quantity: sell.quantity,
      proceeds,
      costBasis,
      gain,
      isLongTerm: false, // Would need to track holding period
    }
  })

  const totalGain = taxItems.reduce((sum: number, item: typeof taxItems[0]) => sum + item.gain, 0)

  if (format === "csv") {
    const headers = [
      "Date",
      "Symbol",
      "Asset Name",
      "Quantity",
      "Proceeds",
      "Cost Basis",
      "Gain/Loss",
      "Holding Period",
    ].join(",")

    const rows = taxItems.map((t: typeof taxItems[0]) =>
      [
        t.date.toISOString().split("T")[0],
        t.symbol,
        t.assetName,
        t.quantity,
        t.proceeds.toFixed(2),
        t.costBasis.toFixed(2),
        t.gain.toFixed(2),
        t.isLongTerm ? "Long-term" : "Short-term",
      ].join(",")
    )

    const summary = [
      "",
      "Summary",
      `Total Capital Gains,${totalGain.toFixed(2)}`,
      `Tax Year,${year}`,
      `Generated,${new Date().toISOString()}`,
    ]

    return {
      data: [headers, ...rows, ...summary].join("\n"),
      filename: `tax_report_${year}.csv`,
      contentType: "text/csv",
    }
  }

  return {
    data: JSON.stringify(
      {
        year,
        generatedAt: new Date().toISOString(),
        totalGain,
        transactions: taxItems,
      },
      null,
      2
    ),
    filename: `tax_report_${year}.json`,
    contentType: "application/json",
  }
}
