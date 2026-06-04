import enMessages from "@/messages/en.json"
import ruMessages from "@/messages/ru.json"
import { t } from "@/lib/i18n"

const requiredErrorKeys = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
  "DATABASE_ERROR",
  "CACHE_ERROR",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_PROVIDER_TIMEOUT",
  "AI_PROVIDER_BAD_REQUEST",
  "AI_CONTEXT_UNAVAILABLE",
  "AI_EMPTY_RESPONSE",
  "UNKNOWN_ERROR",
]

function collectKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return collectKeys(nested, nextPrefix)
  })
}

function getNested(value: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[segment]
  }, value)
}

describe("i18n messages", () => {
  it("contains required API error and AI assistant sections in Russian and English", () => {
    for (const messages of [ruMessages, enMessages]) {
      expect(getNested(messages, "api.errors")).toBeTruthy()
      expect(getNested(messages, "aiAssistant")).toBeTruthy()
      expect(getNested(messages, "common")).toBeTruthy()

      for (const key of requiredErrorKeys) {
        expect(getNested(messages, `api.errors.${key}`)).toEqual(expect.any(String))
      }
    }
  })

  it("keeps ru.json and en.json key sets synchronized", () => {
    const ruKeys = collectKeys(ruMessages).sort()
    const enKeys = collectKeys(enMessages).sort()

    expect(enKeys).toEqual(ruKeys)
  })

  it("falls back to the default locale for missing translations and to the key when absent everywhere", () => {
    expect(t("en", "aiAssistant.title")).toBe("AI investment assistant")
    expect(t("en", "api.errors.AI_PROVIDER_TIMEOUT")).toBe("AI assistant is taking too long to respond. Try again.")
    expect(t("en", "missing.translation.key")).toBe("missing.translation.key")
  })
})
