import { LIMITS, validateEmail, validateHistory, validateMessage } from "@/lib/validation"
import {
  removeDuplicateFinalUserMessage,
  safeJsonForPrompt,
  sanitizeConversationMessages,
  validateOutgoingMessages,
} from "@/lib/ai/prompt-utils"

describe("validation utilities", () => {
  it("validates email format and length", () => {
    expect(validateEmail("user@example.com")).toBe(true)
    expect(validateEmail("not-an-email")).toBe(false)
    expect(validateEmail("user@")).toBe(false)
    expect(validateEmail(`${"a".repeat(250)}@example.com`)).toBe(false)
  })

  it("rejects empty and too long AI messages", () => {
    expect(validateMessage("")).toMatchObject({ valid: false })
    expect(validateMessage("   ")).toMatchObject({ valid: false })
    expect(validateMessage("x".repeat(LIMITS.MESSAGE_MAX + 1))).toMatchObject({ valid: false })
  })

  it("accepts a non-empty AI message", () => {
    expect(validateMessage("Проанализируй мой портфель")).toEqual({ valid: true })
  })

  it("validates history shape and length", () => {
    expect(validateHistory([])).toEqual({ valid: true })
    expect(validateHistory(new Array(LIMITS.HISTORY_MAX_ITEMS + 1).fill({}))).toMatchObject({ valid: false })
  })

  it("sanitizes chat history to supported roles and non-empty content", () => {
    expect(
      sanitizeConversationMessages([
        { role: "system", content: "drop" },
        { role: "user", content: "  hello  " },
        { role: "assistant", content: "hi" },
        { role: "user", content: "" },
        { role: "tool", content: "drop" },
      ]),
    ).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ])
  })

  it("removes a duplicate final user message", () => {
    expect(
      removeDuplicateFinalUserMessage(
        [
          { role: "assistant", content: "Привет" },
          { role: "user", content: "Say hello" },
        ],
        "Say hello",
      ),
    ).toEqual([{ role: "assistant", content: "Привет" }])
  })

  it("requires exactly one system message and at least one user message for outgoing AI payloads", () => {
    expect(
      validateOutgoingMessages([
        { role: "system", content: "rules" },
        { role: "user", content: "question" },
      ]),
    ).toMatchObject({ valid: true })

    expect(validateOutgoingMessages([{ role: "user", content: "question" }])).toMatchObject({ valid: false })
    expect(
      validateOutgoingMessages([
        { role: "system", content: "rules" },
        { role: "system", content: "more rules" },
        { role: "user", content: "question" },
      ]),
    ).toMatchObject({ valid: false })
  })

  it("truncates large JSON context for prompts", () => {
    const result = safeJsonForPrompt({ value: "x".repeat(100) }, 50)
    expect(result.truncated).toBe(true)
    expect(result.text).toContain("[Context truncated because it was too large]")
  })
})
