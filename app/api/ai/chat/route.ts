import { NextRequest } from "next/server"
import { withAuth, errorResponse } from "@/lib/api-handler"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"
import { validateHistory, validateMessage } from "@/lib/validation"
import { findEducationalContext } from "@/lib/ai/knowledge-base"
import { AIClientError, createChatCompletion, type OpenAICompatibleMessage } from "@/lib/ai/openai-compatible-client"
import { buildAIPortfolioContext, getAIContextStatus } from "@/lib/ai/portfolio-context"
import { normalizeAccountScope } from "@/lib/accounts/account-scope"
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
const PERSONAL_CONTEXT_PATTERN =
  /портфел|сч[её]т|баланс|актив|холдинг|позици|экспозици|диверсифик|доходност|прибыл|убыт|риск|рискованн|прогноз|калькулятор|btc|bitcoin|биткоин|курс|котиров|транзакц|сделк|portfolio|account|balance|holding|asset|allocation|diversif|return|performance|pnl|profit|loss|risk|price|quote|calculator/i

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
  accountScope?: unknown
  accountId?: unknown
  displayCurrency?: unknown
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
      return apiError(ApiErrorCode.VALIDATION_ERROR, "Invalid AI request", { status: 400 })
    }

    if (error.code === "non_2xx") {
      return apiError(ApiErrorCode.AI_PROVIDER_BAD_REQUEST, "AI provider rejected the request", { status: 502 })
    }

    if (error.code === "timeout") {
      return apiError(ApiErrorCode.AI_PROVIDER_TIMEOUT, "AI provider request timed out", { status: 504 })
    }

    if (error.code === "network_error") {
      return apiError(ApiErrorCode.AI_PROVIDER_UNAVAILABLE, "AI provider is unavailable", { status: 503 })
    }

    if (error.code === "invalid_response" || error.code === "empty_response") {
      return apiError(ApiErrorCode.AI_EMPTY_RESPONSE, "AI provider returned an invalid or empty response", {
        status: 502,
      })
    }

    if (error.code === "missing_config") {
      return apiError(ApiErrorCode.INTERNAL_ERROR, "AI assistant is not configured", { status: 500 })
    }
  }

  logger.warn("[AI Chat] unexpected request failure", error instanceof Error ? error.message : error)
  return apiError(ApiErrorCode.INTERNAL_ERROR, "Internal server error", { status: 500 })
}

export const POST = withAuth(async (request: NextRequest, user) => {
  let body: ChatRequestBody

  try {
    body = (await request.json()) as ChatRequestBody
  } catch {
    return errorResponse("Invalid JSON body", 400, ApiErrorCode.BAD_REQUEST)
  }

  const conversationSource = getConversationSource(body)
  if (!conversationSource.valid) {
    return errorResponse(conversationSource.error, 400, ApiErrorCode.VALIDATION_ERROR)
  }

  const historyValidation = validateHistory(conversationSource.value)
  if (!historyValidation.valid) {
    return errorResponse(historyValidation.error || "Invalid history", 400, ApiErrorCode.VALIDATION_ERROR)
  }

  const conversation = sanitizeConversationMessages(conversationSource.value, 10)
  const userMessage = getUserMessage(body, conversation)
  const messageValidation = validateMessage(userMessage)
  if (!messageValidation.valid) {
    return errorResponse(messageValidation.error || "Invalid message", 400, ApiErrorCode.VALIDATION_ERROR)
  }

  let portfolioContext: unknown = {
    status: "not_requested",
    note: "The user did not ask for portfolio, account, asset, transaction, or market data. Answer the message directly and do not mention user portfolio data.",
  }
  let contextStatus: ContextStatus | undefined

  if (shouldIncludePortfolioContext(userMessage)) {
    contextStatus = unavailableContextStatus()

    try {
      const builtContext = await buildAIPortfolioContext(
        user.id,
        userMessage,
        normalizeAccountScope(body.accountScope ?? body.accountId),
        typeof body.displayCurrency === "string" ? body.displayCurrency : undefined,
      )
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
    return errorResponse(outgoingMessages.error, 400, ApiErrorCode.VALIDATION_ERROR)
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

    return apiSuccess(
      {
        message: assistantMessage,
        ...(contextStatus ? { contextStatus } : {}),
        timestamp: new Date().toISOString(),
      },
      { message: "AI response generated" },
    )
  } catch (error) {
    return aiErrorResponse(error)
  }
})
