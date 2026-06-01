import { NextRequest, NextResponse } from "next/server"
import { withAuth, errorResponse } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"
import { AIClientError, createChatCompletion, type OpenAICompatibleMessage } from "@/lib/ai/openai-compatible-client"
import { compactSystemContext, safeJsonForPrompt, validateOutgoingMessages } from "@/lib/ai/prompt-utils"
import { PORTFOLIO_REPORT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

const logger = createLogger("AIReportRoute")
const FRIENDLY_AI_ERROR = "AI-ассистент временно недоступен. Проверьте подключение к локальной модели."

type ReportPeriod = "1m" | "3m" | "6m" | "1y" | "all"

function aiErrorResponse(error: unknown, data: unknown) {
  if (error instanceof AIClientError) {
    logger.warn("[AI Report] request failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    })

    if (error.code === "invalid_request") {
      return NextResponse.json(
        {
          report: null,
          data,
          error: "Invalid AI request",
          message: "Отчет не удалось подготовить для AI-ассистента.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (error.code === "non_2xx") {
      return NextResponse.json(
        {
          report: null,
          data,
          error: "AI provider rejected the request",
          message: "AI-ассистент получил некорректный запрос. Попробуйте сократить период отчета или повторить позже.",
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      )
    }

    if (error.code === "timeout" || error.code === "network_error") {
      return NextResponse.json(
        {
          report: null,
          data,
          error: "AI assistant is temporarily unavailable",
          message: FRIENDLY_AI_ERROR,
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }

    if (error.code === "invalid_response" || error.code === "empty_response") {
      return NextResponse.json(
        {
          report: null,
          data,
          error: "AI provider returned an invalid response",
          message: "AI-ассистент получил пустой или некорректный ответ от локальной модели.",
          timestamp: new Date().toISOString(),
        },
        { status: 502 },
      )
    }
  }

  logger.warn("[AI Report] unexpected request failure", error instanceof Error ? error.message : error)
  return NextResponse.json(
    {
      report: null,
      data,
      error: "Internal server error",
      message: "AI-ассистент временно недоступен из-за внутренней ошибки.",
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  )
}

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
    const reportContext = safeJsonForPrompt({ period, portfolioData }, 12000)
    const systemContext = compactSystemContext([
      PORTFOLIO_REPORT_SYSTEM_PROMPT,
      `Portfolio report context:\n${reportContext.text}${
        reportContext.truncated ? "\n\nThe portfolio report context was truncated and may be incomplete." : ""
      }`,
    ])

    const outgoingMessages = validateOutgoingMessages([
      {
        role: "system",
        content: systemContext,
      },
      {
        role: "user",
        content:
          "Сформируй краткий отчет по портфелю: обзор, диверсификация, доходность/риски, что стоит проверить. Не выдумывай отсутствующие данные.",
      },
    ] satisfies OpenAICompatibleMessage[])

    if (!outgoingMessages.valid) {
      return errorResponse(outgoingMessages.error, 400)
    }

    let report: string
    try {
      report = await createChatCompletion(outgoingMessages.messages, {
        temperature: 0.3,
        timeoutMs: 100_000,
      })
    } catch (aiError) {
      return aiErrorResponse(aiError, portfolioData)
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
        error: "Internal server error",
        message: "Не удалось подготовить AI-отчет по портфелю.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
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
