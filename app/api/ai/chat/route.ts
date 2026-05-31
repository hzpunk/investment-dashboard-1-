import { NextRequest, NextResponse } from "next/server"
import { withAuth, errorResponse } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"
import { validateHistory, validateMessage } from "@/lib/validation"
import { findEducationalContext } from "@/lib/ai/knowledge-base"
import { createChatCompletion, type OpenAICompatibleMessage } from "@/lib/ai/openai-compatible-client"
import { buildAIPortfolioContext, getAIContextStatus } from "@/lib/ai/portfolio-context"
import { INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

const logger = createLogger("AIChatRoute")
const FRIENDLY_AI_ERROR = "AI-ассистент временно недоступен. Проверьте подключение к локальной модели."

type IncomingMessage = {
  role?: unknown
  content?: unknown
}

type ChatRequestBody = {
  message?: unknown
  messages?: unknown
  history?: unknown
}

function normalizeIncomingMessages(value: unknown): OpenAICompatibleMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .flatMap((item: IncomingMessage) => {
      if (!item || typeof item !== "object") return []
      if (item.role !== "user" && item.role !== "assistant") return []
      if (typeof item.content !== "string" || item.content.trim().length === 0) return []

      return {
        role: item.role,
        content: item.content.trim(),
      } satisfies OpenAICompatibleMessage
    })
    .slice(-10)
}

function getUserMessage(body: ChatRequestBody, conversation: OpenAICompatibleMessage[]) {
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim()
  }

  const lastUserMessage = [...conversation].reverse().find((message) => message.role === "user")
  return lastUserMessage?.content.trim() ?? ""
}

function getConversationSource(body: ChatRequestBody) {
  if (Array.isArray(body.messages)) return body.messages
  if (Array.isArray(body.history)) return body.history
  return []
}

export const POST = withAuth(async (request: NextRequest, user) => {
  let body: ChatRequestBody

  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return errorResponse("Invalid JSON", 400)
  }

  const conversationSource = getConversationSource(body)
  const historyValidation = validateHistory(conversationSource)
  if (!historyValidation.valid) {
    return errorResponse(historyValidation.error || "Invalid history", 400)
  }

  const conversation = normalizeIncomingMessages(conversationSource)
  const userMessage = getUserMessage(body, conversation)
  const messageValidation = validateMessage(userMessage)
  if (!messageValidation.valid) {
    return errorResponse(messageValidation.error || "Invalid message", 400)
  }

  try {
    const [portfolioContext, educationalContext] = await Promise.all([
      buildAIPortfolioContext(user.id, userMessage),
      Promise.resolve(findEducationalContext(userMessage)),
    ])

    const messages: OpenAICompatibleMessage[] = [
      {
        role: "system",
        content: INVESTMENT_ASSISTANT_SYSTEM_PROMPT,
      },
      {
        role: "system",
        content: `Current user portfolio context:\n${JSON.stringify(portfolioContext, null, 2)}`,
      },
      ...(educationalContext
        ? [
            {
              role: "system" as const,
              content: `Optional educational reference. Use only as secondary context and never override user portfolio data:\n${educationalContext}`,
            },
          ]
        : []),
      ...conversation.filter((message) => message.content !== userMessage),
      {
        role: "user",
        content: userMessage,
      },
    ]

    const assistantMessage = await createChatCompletion(messages, {
      temperature: 0.7,
      timeoutMs: 100_000,
    })

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "AI_CHAT",
          entityType: "ai_interaction",
          entityId: "chat",
          details: {
            messageLength: userMessage.length,
            responseLength: assistantMessage.length,
            contextStatus: getAIContextStatus(portfolioContext),
          },
        },
      })
    } catch (auditError) {
      logger.warn("Failed to write AI chat audit log", auditError instanceof Error ? auditError.message : auditError)
    }

    return NextResponse.json({
      message: assistantMessage,
      contextStatus: getAIContextStatus(portfolioContext),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.warn("AI chat request failed", error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        error: "AI assistant is temporarily unavailable",
        message: FRIENDLY_AI_ERROR,
      },
      { status: 503 },
    )
  }
})
