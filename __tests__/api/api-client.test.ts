import { ApiClientError, apiFetch, getLocalizedApiErrorCode } from "@/lib/api-client"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response
}

function textResponse(_body: string, init: ResponseInit = {}) {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    json: async () => {
      throw new SyntaxError("Invalid JSON")
    },
  } as unknown as Response
}

describe("apiFetch", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("returns data for unified success responses", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        data: { value: 42 },
      }),
    )

    await expect(apiFetch<{ value: number }>("/api/test")).resolves.toEqual({ value: 42 })
  })

  it("throws a typed error for unified error responses", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: { field: "message" },
          },
        },
        { status: 400 },
      ),
    )

    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "VALIDATION_ERROR",
      status: 400,
      details: { field: "message" },
    })
  })

  it("handles non-JSON responses safely", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(textResponse("not json", { status: 502 }))

    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      message: "Request failed",
      status: 502,
    })
  })

  it("passes network errors through as fetch failures", async () => {
    const error = new TypeError("Network failed")
    jest.mocked(global.fetch).mockRejectedValueOnce(error)

    await expect(apiFetch("/api/test")).rejects.toBe(error)
  })

  it("maps API error codes to localized messages with fallback", () => {
    const t = (key: string) =>
      ({
        "api.errors.AI_PROVIDER_TIMEOUT": "AI assistant timed out",
        "api.errors.UNKNOWN_ERROR": "Unknown error",
      })[key] ?? key

    expect(getLocalizedApiErrorCode(t, "AI_PROVIDER_TIMEOUT")).toBe("AI assistant timed out")
    expect(getLocalizedApiErrorCode(t, "MISSING_KEY")).toBe("Unknown error")
    expect(new ApiClientError("x", "BAD_REQUEST", 400)).toBeInstanceOf(Error)
  })
})
