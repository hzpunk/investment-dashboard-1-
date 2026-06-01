import type { OpenAICompatibleMessage } from "@/lib/ai/openai-compatible-client"

const ALLOWED_ROLES = new Set(["system", "user", "assistant"])

export function truncateForPrompt(value: string | null | undefined, maxLength = 4000) {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) {
    return { text: "", truncated: false }
  }

  if (text.length <= maxLength) {
    return { text, truncated: false }
  }

  return {
    text: `${text.slice(0, maxLength)}\n\n[Context truncated because it was too large]`,
    truncated: true,
  }
}

export function safeJsonForPrompt(value: unknown, maxLength = 12000) {
  let text: string

  try {
    text = JSON.stringify(value, null, 2)
  } catch {
    text = JSON.stringify({
      status: "unavailable",
      warning: "Context could not be serialized. Do not invent missing user data.",
    })
  }

  return truncateForPrompt(text, maxLength)
}

export function compactSystemContext(parts: Array<string | null | undefined | false>) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join("\n\n")
}

export function sanitizeConversationMessages(value: unknown, limit = 10): OpenAICompatibleMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return []

      const role = (item as { role?: unknown }).role
      const content = (item as { content?: unknown }).content

      if (role !== "user" && role !== "assistant") return []
      if (typeof content !== "string") return []

      const trimmed = content.trim()
      if (!trimmed) return []

      return [{ role, content: trimmed } satisfies OpenAICompatibleMessage]
    })
    .slice(-limit)
}

export function removeDuplicateFinalUserMessage(
  conversation: OpenAICompatibleMessage[],
  userMessage: string,
): OpenAICompatibleMessage[] {
  const copy = [...conversation]
  const lastMessage = copy[copy.length - 1]

  if (lastMessage?.role === "user" && lastMessage.content.trim() === userMessage.trim()) {
    copy.pop()
  }

  return copy
}

export function validateOutgoingMessages(messages: OpenAICompatibleMessage[]): {
  valid: true
  messages: OpenAICompatibleMessage[]
} | {
  valid: false
  error: string
} {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array" }
  }

  const sanitized = messages.flatMap((message) => {
    if (!message || typeof message !== "object") return []
    if (!ALLOWED_ROLES.has(message.role)) return []
    if (typeof message.content !== "string") return []

    const content = message.content.trim()
    if (!content) return []

    return [{ role: message.role, content } satisfies OpenAICompatibleMessage]
  })

  const hasSystem = sanitized.some((message) => message.role === "system")
  const hasUser = sanitized.some((message) => message.role === "user")

  if (!hasSystem || !hasUser) {
    return {
      valid: false,
      error: "Messages must include a non-empty system message and user message",
    }
  }

  if (sanitized.filter((message) => message.role === "system").length !== 1) {
    return { valid: false, error: "Only one system message is allowed" }
  }

  return { valid: true, messages: sanitized }
}
