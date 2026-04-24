import { NextRequest, NextResponse } from 'next/server'
import { withAuth, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { validateMessage, validateHistory } from '@/lib/validation'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ai:11434'
const MODEL = process.env.AI_MODEL || 'mistral:7b'

// System prompt for investment advisor
const SYSTEM_PROMPT = `Ты — профессиональный финансовый консультант и инвестиционный аналитик. 
Твоя задача — помогать пользователям с вопросами об инвестициях, финансах и рынках.

Правила:
1. Отвечай только на вопросы, связанные с инвестициями, финансами, экономикой и рынками
2. Если вопрос не по теме — вежливо откажи и предложи инвестиционную тему
3. Всегда напоминай, что это не финансовый совет (not financial advice)
4. Отвечай на русском языке
5. Будь кратким и по делу
6. Не давай конкретных прогнозов цен — только анализ и образовательную информацию

Примеры допустимых тем:
- Объяснение финансовых терминов
- Анализ типов инвестиций (акции, облигации, ETF)
- Стратегии диверсификации
- Общие принципы анализа рынка
- Налоговые аспекты инвестирования
- Риски и управление рисками

Примеры тем, которые НЕ обсуждаем:
- Конкретные прогнозы цен акций
- "Купить или продать" конкретный актив
- Нелегальные схемы
- Нефинансовые темы (погода, спорт, политика)`

// POST /api/ai/chat - Chat with AI investment advisor
export const POST = withAuth(async (request: NextRequest, user) => {
  let body: { message?: string; history?: unknown[] }
  
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }
  
  const { message, history = [] } = body
  
  // Validate message
  const messageValidation = validateMessage(message || '')
  if (!messageValidation.valid) {
    return errorResponse(messageValidation.error || 'Invalid message', 400)
  }
  
  // Validate history
  const historyValidation = validateHistory(history)
  if (!historyValidation.valid) {
    return errorResponse(historyValidation.error || 'Invalid history', 400)
  }

  try {
    // Get user portfolio context for personalized advice
    const portfolioContext = await getUserPortfolioContext(user.id)

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaHealth()
    if (!ollamaAvailable) {
      return errorResponse('AI service temporarily unavailable', 503)
    }

    // Prepare messages for Ollama
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(portfolioContext ? [{ role: 'system', content: portfolioContext }] : []),
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ]

    // Call Ollama
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500, // Limit response length
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`)
    }

    const data = await response.json()

    // Log interaction for analytics
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AI_CHAT',
        entityType: 'ai_interaction',
        entityId: 'chat',
        details: {
          messageLength: message!.length,
          responseLength: data.message?.content?.length || 0,
          model: MODEL
        }
      }
    })

    return NextResponse.json({
      response: data.message?.content || 'Извините, не удалось сгенерировать ответ.',
      model: MODEL,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return errorResponse('Failed to process request', 500)
  }
})

// Get user's portfolio summary for context
async function getUserPortfolioContext(userId: string): Promise<string | null> {
  try {
    const [accounts, portfolios, transactions] = await Promise.all([
      prisma.account.findMany({ where: { userId } }),
      prisma.portfolio.findMany({
        where: { userId },
        include: {
          assets: {
            include: { asset: true }
          }
        }
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 5
      })
    ])

    const totalBalance = accounts.reduce((sum: number, a: typeof accounts[0]) => sum + a.balance, 0)
    const portfolioValue = portfolios.reduce((sum: number, p: typeof portfolios[0]) => 
      sum + p.assets.reduce((aSum: number, pa: typeof p.assets[0]) => 
        aSum + pa.quantity * pa.asset.currentPrice, 0), 0)

    if (totalBalance === 0 && portfolioValue === 0) {
      return null
    }

    return `Контекст пользователя:
- Общий баланс счетов: $${totalBalance.toFixed(2)}
- Стоимость портфеля: $${portfolioValue.toFixed(2)}
- Количество счетов: ${accounts.length}
- Количество портфелей: ${portfolios.length}
- Недавние транзакции: ${transactions.length}

Используй эту информацию для персонализации ответов, но не упоминай конкретные суммы если пользователь не спрашивает.`
  } catch {
    return null
  }
}

// Health check for Ollama
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
