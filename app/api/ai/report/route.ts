// POST /api/ai/report - Generate AI portfolio analysis report
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ai:11434'
const MODEL = process.env.AI_MODEL || 'mistral:7b'

// System prompt for report generation
const REPORT_SYSTEM_PROMPT = `Ты — AI-аналитик инвестиционного портфеля. 
Твоя задача — создавать профессиональные отчеты по портфелю пользователя.

СТРУКТУРА ОТЧЕТА:
1. Краткая сводка портфеля (обзор)
2. Анализ диверсификации (распределение по активам)
3. Ключевые метрики (доходность, риски)
4. Рекомендации (3-5 пунктов)

ПРАВИЛА:
1. Используй только предоставленные данные портфеля
2. Не давай конкретных инвестиционных советов (купить/продать)
3. Акцент на образовательную информацию и анализ
4. Отвечай на русском языке
5. Будь объективным — указывай как сильные, так и слабые стороны
6. Всегда добавляй дисклеймер: "Это не финансовый совет"`

// POST /api/ai/report - Generate portfolio analysis report
export const POST = withAuth(async (request: NextRequest, user) => {
  let body: { portfolioId?: string; period?: '1m' | '3m' | '6m' | '1y' | 'all' }
  
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const portfolioId = body?.portfolioId
  const period = body?.period || '1y'

  try {
    // Get portfolio data
    const portfolio = await prisma.portfolio.findFirst({
      where: { 
        id: portfolioId,
        userId: user.id 
      },
      include: {
        assets: {
          include: {
            asset: true
          }
        }
      }
    })

    if (!portfolio) {
      return errorResponse('Portfolio not found', 404)
    }

    // Get transactions for the period
    const now = new Date()
    const periodMap = {
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      'all': 3650 // 10 years
    }
    const days = periodMap[period] || 365
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: fromDate }
      },
      include: {
        asset: { select: { symbol: true, name: true, type: true } }
      },
      orderBy: { date: 'desc' }
    })

    // Calculate metrics
    const portfolioData = calculatePortfolioMetrics(portfolio, transactions)

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaHealth()
    if (!ollamaAvailable) {
      // Return data without AI analysis
      return NextResponse.json({
        report: null,
        data: portfolioData,
        error: 'AI service unavailable. Raw data provided.',
        timestamp: new Date().toISOString()
      })
    }

    // Generate report with AI
    const reportPrompt = generateReportPrompt(portfolioData, period)
    
    const aiResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        system: REPORT_SYSTEM_PROMPT,
        prompt: reportPrompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more factual reports
          num_predict: 2000
        }
      })
    })

    if (!aiResponse.ok) {
      return NextResponse.json({
        report: null,
        data: portfolioData,
        error: 'Failed to generate AI report',
        timestamp: new Date().toISOString()
      })
    }

    const aiData = await aiResponse.json()
    const report = aiData.response || ''

    // Log report generation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_REPORT_GENERATED',
        entityType: 'portfolio',
        entityId: portfolio.id,
        details: { period, assetCount: portfolio.assets.length }
      }
    })

    return NextResponse.json({
      report,
      data: portfolioData,
      period,
      generatedAt: new Date().toISOString()
    } as any)

  } catch (error) {
    return errorResponse('Failed to generate report', 500)
  }
})

function calculatePortfolioMetrics(portfolio: any, transactions: any[]) {
  const assets = portfolio.assets || []
  
  // Calculate total value
  const totalValue = assets.reduce((sum: number, pa: any) => {
    return sum + (pa.quantity * pa.asset.currentPrice)
  }, 0)

  // Calculate allocation by type
  const allocationByType: Record<string, { value: number; percent: number }> = {}
  assets.forEach((pa: any) => {
    const type = pa.asset.type
    const value = pa.quantity * pa.asset.currentPrice
    if (!allocationByType[type]) {
      allocationByType[type] = { value: 0, percent: 0 }
    }
    allocationByType[type].value += value
  })

  // Calculate percentages
  Object.keys(allocationByType).forEach(type => {
    allocationByType[type].percent = totalValue > 0 
      ? (allocationByType[type].value / totalValue) * 100 
      : 0
  })

  // Calculate transactions summary
  const buyCount = transactions.filter(t => t.type === 'buy').length
  const sellCount = transactions.filter(t => t.type === 'sell').length
  const dividendCount = transactions.filter(t => t.type === 'dividend').length

  const totalInvested = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.totalAmount, 0)

  const totalProceeds = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.totalAmount, 0)

  return {
    portfolioName: portfolio.name,
    description: portfolio.description,
    strategy: portfolio.strategy,
    totalValue,
    assetCount: assets.length,
    allocationByType,
    transactionsSummary: {
      total: transactions.length,
      buy: buyCount,
      sell: sellCount,
      dividend: dividendCount,
      totalInvested,
      totalProceeds,
      realizedPnL: totalProceeds - totalInvested
    },
    topHoldings: assets
      .map((pa: any) => ({
        symbol: pa.asset.symbol,
        name: pa.asset.name,
        quantity: pa.quantity,
        value: pa.quantity * pa.asset.currentPrice,
        percent: totalValue > 0 ? ((pa.quantity * pa.asset.currentPrice) / totalValue) * 100 : 0
      }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10)
  }
}

function generateReportPrompt(data: any, period: string): string {
  return `
Проанализируй следующий инвестиционный портфель и создай профессиональный отчет.

ПЕРИОД АНАЛИЗА: ${period}

ИНФОРМАЦИЯ О ПОРТФЕЛЕ:
Название: ${data.portfolioName}
${data.description ? `Описание: ${data.description}` : ''}
${data.strategy ? `Стратегия: ${data.strategy}` : ''}

ФИНАНСОВЫЕ ПОКАЗАТЕЛИ:
Общая стоимость: $${data.totalValue.toLocaleString()}
Количество активов: ${data.assetCount}

РАСПРЕДЕЛЕНИЕ ПО ТИПАМ АКТИВОВ:
${Object.entries(data.allocationByType).map(([type, info]: [string, any]) => 
  `- ${type}: $${info.value.toLocaleString()} (${info.percent.toFixed(1)}%)`
).join('\n')}

ТОП-10 ПОЗИЦИЙ:
${data.topHoldings.map((h: any, i: number) => 
  `${i + 1}. ${h.symbol} (${h.name}): ${h.quantity} шт. = $${h.value.toLocaleString()} (${h.percent.toFixed(1)}%)`
).join('\n')}

СВОДКА ОПЕРАЦИЙ ЗА ПЕРИОД:
Всего операций: ${data.transactionsSummary.total}
Покупок: ${data.transactionsSummary.buy}
Продаж: ${data.transactionsSummary.sell}
Дивидендов: ${data.transactionsSummary.dividend}
Всего инвестировано: $${data.transactionsSummary.totalInvested.toLocaleString()}
Всего выручки от продаж: $${data.transactionsSummary.totalProceeds.toLocaleString()}
Реализованная P&L: $${data.transactionsSummary.realizedPnL.toLocaleString()}

Создай структурированный отчет по шаблону:
1. Обзор портфеля (2-3 предложения)
2. Анализ диверсификации (распределение по типам активов)
3. Ключевые метрики и тренды
4. Рекомендации (3-5 пунктов без конкретных советов купить/продать)

В конце добавь дисклеймер: "Это не финансовый совет. Информация предоставлена в образовательных целях."
`
}

async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}
