import { NextRequest, NextResponse } from "next/server"
import { withAuth, errorResponse } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"
import { validateHistory, validateMessage } from "@/lib/validation"
import { findEducationalContext } from "@/lib/ai/knowledge-base"
import { AIClientError, createChatCompletion, type OpenAICompatibleMessage } from "@/lib/ai/openai-compatible-client"
import { buildAIPortfolioContext, getAIContextStatus } from "@/lib/ai/portfolio-context"
import {
  compactSystemContext,
  removeDuplicateFinalUserMessage,
  safeJsonForPrompt,
  sanitizeConversationMessages,
  truncateForPrompt,
  validateOutgoingMessages,
} from "@/lib/ai/prompt-utils"
import { INVESTMENT_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

const logger = createLogger("AIChatRoute")
const FRIENDLY_AI_ERROR = "AI-ассистент временно недоступен. Проверьте подключение к локальной модели."
const PROVIDER_REJECTED_MESSAGE =
  "AI-ассистент получил некорректный запрос. Попробуйте сократить сообщение или повторить позже."

const PERSONAL_CONTEXT_PATTERN =
  /портфел|сч[её]т|баланс|актив|холдинг|позици|экспозици|диверсификац|доходност|прибыл|убыт|рискованн|btc|bitcoin|биткоин|курс|котиров|транзакц|сделк|portfolio|account|balance|holding|asset|allocation|diversif|return|performance|pnl|profit|loss|risk|price|quote/i

type ContextStatusValue = "available" | "partial" | "empty" | "unavailable"

type ContextStatus = {
  portfolio: ContextStatusValue
  accounts: ContextStatusValue
  marketData: ContextStatusValue
}

type ChatRequestBody = {
  message?: unknown
  messages?: unknown
  history?: unknown
}

function getUserMessage(body: ChatRequestBody, conversation: OpenAICompatibleMessage[]) {
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim()
  }

  const lastUserMessage = [...conversation].reverse().find((message) => message.role === "user")
  return lastUserMessage?.content.trim() ?? ""
}

function getConversationSource(body: ChatRequestBody): { valid: true; value: unknown[] } | { valid: false; error: string } {
  if (body.messages !== undefined) {
    return Array.isArray(body.messages)
      ? { valid: true, value: body.messages }
      : { valid: false, error: "Messages must be an array" }
  }

  if (body.history !== undefined) {
    return Array.isArray(body.history)
      ? { valid: true, value: body.history }
      : { valid: false, error: "History must be an array" }
  }

  return { valid: true, value: [] }
}

function unavailableContextStatus(): ContextStatus {
  return {
    portfolio: "unavailable",
    accounts: "unavailable",
    marketData: "unavailable",
  }
}

function shouldIncludePortfolioContext(message: string) {
  return PERSONAL_CONTEXT_PATTERN.test(message)
}

function aiErrorResponse(error: unknown) {
  if (error instanceof AIClientError) {
    logger.warn("[AI Chat] request failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    })

    if (error.code === "invalid_request") {
      return NextResponse.json(
        {
          error: "Invalid AI request",
          message: "Сообщение не удалось подготовить для AI-ассистента.",
        },
        { status: 400 },
      )
    }

    if (error.code === "non_2xx") {
      return NextResponse.json(
        {
          error: "AI provider rejected the request",
          message: PROVIDER_REJECTED_MESSAGE,
        },
        { status: 502 },
      )
    }

    if (error.code === "timeout" || error.code === "network_error") {
      return NextResponse.json(
        {
          error: "AI assistant is temporarily unavailable",
          message: FRIENDLY_AI_ERROR,
        },
        { status: 503 },
      )
    }

    if (error.code === "invalid_response" || error.code === "empty_response") {
      return NextResponse.json(
        {
          error: "AI provider returned an invalid response",
          message: "AI-ассистент получил пустой или некорректный ответ от локальной модели.",
        },
        { status: 502 },
      )
    }

    if (error.code === "missing_config") {
      return NextResponse.json(
        {
          error: "AI assistant is not configured",
          message: "AI-ассистент сейчас не настроен на сервере.",
        },
        { status: 500 },
      )
    }
  }

  logger.warn("[AI Chat] unexpected request failure", error instanceof Error ? error.message : error)
  return NextResponse.json(
    {
      error: "Internal server error",
      message: "AI-ассистент временно недоступен из-за внутренней ошибки.",
    },
    { status: 500 },
  )
}

export const POST = withAuth(async (request: NextRequest, user) => {
  let body: ChatRequestBody

  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return errorResponse("Invalid JSON", 400)
  }

  const conversationSource = getConversationSource(body)
  if (!conversationSource.valid) {
    return errorResponse(conversationSource.error, 400)
  }

  const historyValidation = validateHistory(conversationSource.value)
  if (!historyValidation.valid) {
    return errorResponse(historyValidation.error || "Invalid history", 400)
  }

  const conversation = sanitizeConversationMessages(conversationSource.value, 10)
  const userMessage = getUserMessage(body, conversation)
  const messageValidation = validateMessage(userMessage)
  if (!messageValidation.valid) {
    return errorResponse(messageValidation.error || "Invalid message", 400)
  }

  let portfolioContext: unknown = {
    status: "not_requested",
    note: "The user did not ask for portfolio, account, asset, transaction, or market data. Answer the message directly and do not mention user portfolio data.",
  }
  let contextStatus: ContextStatus | undefined

  if (shouldIncludePortfolioContext(userMessage)) {
    contextStatus = unavailableContextStatus()

    try {
      const builtContext = await buildAIPortfolioContext(user.id, userMessage)
      portfolioContext = builtContext
      contextStatus = getAIContextStatus(builtContext)
    } catch (contextError) {
      console.error("[AI Chat] Failed to build portfolio context:", contextError)
      portfolioContext = {
        status: "unavailable",
        warning:
          "Portfolio context is unavailable. Answer only general questions and do not invent user portfolio data.",
      }
    }
  }

  let educationalContext: string | null = null
  try {
    educationalContext = findEducationalContext(userMessage)
  } catch (knowledgeError) {
    console.error("[AI Chat] Failed to load educational context:", knowledgeError)
  }

  const portfolioContextText = safeJsonForPrompt(portfolioContext, 12000)
  const educationText = truncateForPrompt(educationalContext, 4000)
  const safeConversation = removeDuplicateFinalUserMessage(conversation, userMessage)
  const systemContext = compactSystemContext([
    INVESTMENT_ASSISTANT_SYSTEM_PROMPT,
    `Current user portfolio context:\n${portfolioContextText.text}${
      portfolioContextText.truncated ? "\n\nThe portfolio context was truncated and may be incomplete." : ""
    }`,
    educationText.text
      ? `Optional educational reference. Use only as secondary context and never override user portfolio data:\n${educationText.text}${
          educationText.truncated ? "\n\nThe educational reference was truncated." : ""
        }`
      : "",
  ])

  const outgoingMessages = validateOutgoingMessages([
    {
      role: "system",
      content: systemContext,
    },
    ...safeConversation,
    {
      role: "user",
      content: userMessage,
    },
  ])

  if (!outgoingMessages.valid) {
    return errorResponse(outgoingMessages.error, 400)
  }

  try {
    const assistantMessage = await createChatCompletion(outgoingMessages.messages, {
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
            contextStatus: contextStatus ?? "not_requested",
          },
        },
      })
    } catch (auditError) {
      logger.warn("Failed to write AI chat audit log", auditError instanceof Error ? auditError.message : auditError)
    }

    return NextResponse.json({
      message: assistantMessage,
      ...(contextStatus ? { contextStatus } : {}),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return aiErrorResponse(error)
  }
})
