import "server-only"

import { createLogger } from "@/lib/logger"

const logger = createLogger("OpenAICompatibleAI")
const DEFAULT_TIMEOUT_MS = 100_000

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

export async function createChatCompletion(
  messages: OpenAICompatibleMessage[],
  options: ChatCompletionOptions = {},
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs(options.timeoutMs))

  try {
    const response = await fetch(getChatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: getModel(),
        messages,
        temperature: options.temperature ?? 0.7,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) {
      logger.warn("LM Studio returned a non-2xx response", { status: response.status })
      throw new AIClientError("AI provider returned an error", "non_2xx", response.status)
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
