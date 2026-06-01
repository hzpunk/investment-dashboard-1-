import "server-only"

import { createLogger } from "@/lib/logger"

const logger = createLogger("OpenAICompatibleAI")
const DEFAULT_TIMEOUT_MS = 100_000
const MAX_PROVIDER_ERROR_LOG_LENGTH = 4000
const SYSTEM_ROLE_UNSUPPORTED_PATTERN = /only user and assistant roles are supported/i
let providerRequiresUserAssistantRoles = process.env.AI_FORCE_USER_ASSISTANT_ROLES === "true"

export type OpenAICompatibleMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type ChatCompletionOptions = {
  temperature?: number
  timeoutMs?: number
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public code:
      | "missing_config"
      | "timeout"
      | "network_error"
      | "invalid_request"
      | "non_2xx"
      | "invalid_response"
      | "empty_response",
    public status?: number,
  ) {
    super(message)
    this.name = "AIClientError"
  }
}

function getTimeoutMs(timeoutMs?: number) {
  const configured = Number(process.env.AI_REQUEST_TIMEOUT_MS)
  if (timeoutMs && Number.isFinite(timeoutMs)) return timeoutMs
  if (Number.isFinite(configured) && configured > 0) return configured
  return DEFAULT_TIMEOUT_MS
}

function getChatCompletionsUrl() {
  const baseUrl = process.env.OLLAMA_URL?.trim()
  if (!baseUrl) {
    throw new AIClientError("AI base URL is not configured", "missing_config")
  }

  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`
}

function shouldDebugAI() {
  return process.env.AI_DEBUG === "true" || process.env.NODE_ENV !== "production"
}

function safeUrlForLogs(url: string) {
  try {
    const parsed = new URL(url)
    parsed.username = ""
    parsed.password = ""
    return parsed.toString()
  } catch {
    return url.replace(/\/\/[^/@]+@/, "//[redacted]@")
  }
}

function getModel() {
  const model = process.env.AI_MODEL?.trim()
  if (!model) {
    throw new AIClientError("AI model is not configured", "missing_config")
  }
  return model
}

async function parseJsonResponse(response: Response) {
  const raw = await response.text()
  if (!raw) {
    throw new AIClientError("AI response body is empty", "empty_response", response.status)
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new AIClientError("AI response is not valid JSON", "invalid_response", response.status)
  }
}

function validateMessages(messages: OpenAICompatibleMessage[]) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AIClientError("AI messages must be a non-empty array", "invalid_request")
  }

  return messages.map((message) => {
    if (
      !message ||
      (message.role !== "system" && message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      !message.content.trim()
    ) {
      throw new AIClientError("AI messages contain an invalid role or empty content", "invalid_request")
    }

    return {
      role: message.role,
      content: message.content.trim(),
    } satisfies OpenAICompatibleMessage
  })
}

function foldSystemMessagesIntoUserMessage(messages: OpenAICompatibleMessage[]) {
  const systemContext = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n")
  const conversationMessages = messages.filter((message) => message.role !== "system")

  if (!systemContext) return conversationMessages

  if (conversationMessages.length === 0) {
    return [
      {
        role: "user",
        content: systemContext,
      },
    ] satisfies OpenAICompatibleMessage[]
  }

  const [firstMessage, ...restMessages] = conversationMessages
  if (firstMessage.role === "user") {
    return [
      {
        role: "user",
        content: `Системные инструкции и контекст:\n${systemContext}\n\nСообщение пользователя:\n${firstMessage.content}`,
      },
      ...restMessages,
    ] satisfies OpenAICompatibleMessage[]
  }

  return [
    {
      role: "user",
      content: `Системные инструкции и контекст:\n${systemContext}`,
    },
    firstMessage,
    ...restMessages,
  ] satisfies OpenAICompatibleMessage[]
}

function shouldRetryWithoutSystemRole(status: number, errorBody: string, messages: OpenAICompatibleMessage[]) {
  return status === 400 && messages.some((message) => message.role === "system") && SYSTEM_ROLE_UNSUPPORTED_PATTERN.test(errorBody)
}

function logDebugPayload(providerUrl: string, model: string, messages: OpenAICompatibleMessage[]) {
  if (!shouldDebugAI()) return

  console.log("[AI Debug]", {
    providerUrl: safeUrlForLogs(providerUrl),
    model,
    messageCount: messages.length,
    roles: messages.map((message) => message.role),
    totalContentLength: messages.reduce((sum, message) => sum + message.content.length, 0),
  })
}

function logProviderError(providerUrl: string, model: string, response: Response, errorBody: string, attempt: string) {
  const loggedBody =
    errorBody.length > MAX_PROVIDER_ERROR_LOG_LENGTH
      ? `${errorBody.slice(0, MAX_PROVIDER_ERROR_LOG_LENGTH)}... [truncated]`
      : errorBody

  console.error("[AI Client] Provider error:", {
    providerUrl: safeUrlForLogs(providerUrl),
    model,
    attempt,
    status: response.status,
    statusText: response.statusText,
    body: loggedBody,
  })
}

async function sendChatCompletionRequest(
  providerUrl: string,
  model: string,
  messages: OpenAICompatibleMessage[],
  temperature: number,
  signal: AbortSignal,
) {
  logDebugPayload(providerUrl, model, messages)

  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      stream: false,
    }),
    cache: "no-store",
    signal,
  })

  if (shouldDebugAI()) {
    console.log("[AI Debug] Provider response", {
      providerUrl: safeUrlForLogs(providerUrl),
      status: response.status,
      statusText: response.statusText,
    })
  }

  return response
}

export async function createChatCompletion(
  messages: OpenAICompatibleMessage[],
  options: ChatCompletionOptions = {},
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs(options.timeoutMs))

  try {
    const providerUrl = getChatCompletionsUrl()
    const model = getModel()
    const safeMessages = validateMessages(messages)
    const temperature = options.temperature ?? 0.7
    const useUserAssistantOnly = providerRequiresUserAssistantRoles && safeMessages.some((message) => message.role === "system")
    const initialMessages = useUserAssistantOnly ? foldSystemMessagesIntoUserMessage(safeMessages) : safeMessages
    const initialAttempt = useUserAssistantOnly ? "user_assistant_only" : "standard"

    let response = await sendChatCompletionRequest(providerUrl, model, initialMessages, temperature, controller.signal)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")

      if (initialAttempt === "standard" && shouldRetryWithoutSystemRole(response.status, errorBody, safeMessages)) {
        providerRequiresUserAssistantRoles = true
        logProviderError(providerUrl, model, response, errorBody, initialAttempt)

        const userAssistantMessages = foldSystemMessagesIntoUserMessage(safeMessages)

        logger.warn("Provider rejected system role; retrying with system context folded into user message", {
          providerUrl: safeUrlForLogs(providerUrl),
          model,
          messageCount: userAssistantMessages.length,
          roles: userAssistantMessages.map((message) => message.role),
        })

        response = await sendChatCompletionRequest(providerUrl, model, userAssistantMessages, temperature, controller.signal)

        if (response.ok) {
          const data = await parseJsonResponse(response)
          const content = data?.choices?.[0]?.message?.content

          if (typeof content !== "string") {
            throw new AIClientError("AI response has an unexpected format", "invalid_response", response.status)
          }

          const trimmed = content.trim()
          if (!trimmed) {
            throw new AIClientError("AI response content is empty", "empty_response", response.status)
          }

          return trimmed
        }

        const retryErrorBody = await response.text().catch(() => "")
        logProviderError(providerUrl, model, response, retryErrorBody, "user_assistant_only")

        throw new AIClientError(
          `AI provider returned an error: ${retryErrorBody || response.statusText}`,
          "non_2xx",
          response.status,
        )
      }

      logProviderError(providerUrl, model, response, errorBody, initialAttempt)

      throw new AIClientError(
        `AI provider returned an error: ${errorBody || response.statusText}`,
        "non_2xx",
        response.status,
      )
    }

    const data = await parseJsonResponse(response)
    const content = data?.choices?.[0]?.message?.content

    if (typeof content !== "string") {
      throw new AIClientError("AI response has an unexpected format", "invalid_response", response.status)
    }

    const trimmed = content.trim()
    if (!trimmed) {
      throw new AIClientError("AI response content is empty", "empty_response", response.status)
    }

    return trimmed
  } catch (error) {
    if (error instanceof AIClientError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AIClientError("AI request timed out", "timeout")
    }

    logger.warn("Failed to reach LM Studio", error instanceof Error ? error.message : error)
    throw new AIClientError("AI provider is unavailable", "network_error")
  } finally {
    clearTimeout(timeout)
  }
}
