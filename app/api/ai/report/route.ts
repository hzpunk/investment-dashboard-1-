import { NextRequest, NextResponse } from "next/server"
import { withAuth, errorResponse } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"
import { createChatCompletion, type OpenAICompatibleMessage } from "@/lib/ai/openai-compatible-client"
import { PORTFOLIO_REPORT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

const logger = createLogger("AIReportRoute")

type ReportPeriod = "1m" | "3m" | "6m" | "1y" | "all"

export const POST = withAuth(async (request: NextRequest, user) => {
  let body: { portfolioId?: string; period?: ReportPeriod }

  try {
    body = await request.json()
  } catch {
    return errorResponse("Invalid JSON", 400)
  }

  const portfolioId = body?.portfolioId
  const period = body?.period || "1y"

  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: user.id,
      },
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

    const now = new Date()
    const periodMap: Record<ReportPeriod, number> = {
      "1m": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
      all: 3650,
    }
    const fromDate = new Date(now.getTime() - periodMap[period] * 24 * 60 * 60 * 1000)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: fromDate },
      },
      include: {
        asset: { select: { symbol: true, name: true, type: true } },
      },
      orderBy: { date: "desc" },
    })

    const portfolioData = calculatePortfolioMetrics(portfolio, transactions)
    const messages: OpenAICompatibleMessage[] = [
      {
        role: "system",
        content: PORTFOLIO_REPORT_SYSTEM_PROMPT,
      },
      {
        role: "system",
        content: `Portfolio report context:\n${JSON.stringify({ period, portfolioData }, null, 2)}`,
      },
      {
        role: "user",
        content:
          "Сформируй краткий отчет по портфелю: обзор, диверсификация, доходность/риски, что стоит проверить. Не выдумывай отсутствующие данные.",
      },
    ]

    let report: string
    try {
      report = await createChatCompletion(messages, {
        temperature: 0.3,
        timeoutMs: 100_000,
      })
    } catch (aiError) {
      logger.warn("AI report provider failed", aiError instanceof Error ? aiError.message : aiError)
      return NextResponse.json(
        {
          report: null,
          data: portfolioData,
          error: "AI assistant is temporarily unavailable",
          message: "AI-ассистент временно недоступен. Проверьте подключение к локальной модели.",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "AI_REPORT_GENERATED",
          entityType: "portfolio",
          entityId: portfolio.id,
          details: { period, assetCount: portfolio.assets.length },
        },
      })
    } catch (auditError) {
      logger.warn("Failed to write AI report audit log", auditError instanceof Error ? auditError.message : auditError)
    }

    return NextResponse.json({
      report,
      data: portfolioData,
      period,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn("AI report generation failed", error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        report: null,
        error: "AI assistant is temporarily unavailable",
        message: "AI-ассистент временно недоступен. Проверьте подключение к локальной модели.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
})

function calculatePortfolioMetrics(portfolio: any, transactions: any[]) {
  const assets = portfolio.assets || []
  const totalValue = assets.reduce((sum: number, portfolioAsset: any) => {
    return sum + portfolioAsset.quantity * portfolioAsset.asset.currentPrice
  }, 0)

  const allocationByType: Record<string, { value: number; percent: number }> = {}
  assets.forEach((portfolioAsset: any) => {
    const type = portfolioAsset.asset.type
    const value = portfolioAsset.quantity * portfolioAsset.asset.currentPrice
    if (!allocationByType[type]) {
      allocationByType[type] = { value: 0, percent: 0 }
    }
    allocationByType[type].value += value
  })

  Object.keys(allocationByType).forEach((type) => {
    allocationByType[type].percent = totalValue > 0 ? (allocationByType[type].value / totalValue) * 100 : 0
  })

  const buyTransactions = transactions.filter((transaction) => transaction.type === "buy")
  const sellTransactions = transactions.filter((transaction) => transaction.type === "sell")
  const dividendTransactions = transactions.filter((transaction) => transaction.type === "dividend")

  const totalInvested = buyTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0)
  const totalProceeds = sellTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0)

  return {
    portfolioName: portfolio.name,
    description: portfolio.description,
    totalValue,
    assetCount: assets.length,
    allocationByType,
    transactionsSummary: {
      total: transactions.length,
      buy: buyTransactions.length,
      sell: sellTransactions.length,
      dividend: dividendTransactions.length,
      totalInvested,
      totalProceeds,
      realizedPnL: totalProceeds - totalInvested,
    },
    topHoldings: assets
      .map((portfolioAsset: any) => {
        const value = portfolioAsset.quantity * portfolioAsset.asset.currentPrice
        return {
          symbol: portfolioAsset.asset.symbol,
          name: portfolioAsset.asset.name,
          quantity: portfolioAsset.quantity,
          currentPrice: portfolioAsset.asset.currentPrice,
          currentPriceUpdatedAt: portfolioAsset.asset.updatedAt,
          value,
          percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10),
  }
}
