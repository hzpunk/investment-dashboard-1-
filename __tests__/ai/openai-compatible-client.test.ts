jest.mock("server-only", () => ({}), { virtual: true })

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    statusText: init.statusText ?? "",
    text: async () => JSON.stringify(body),
  } as Response
}

function textResponse(body: string, init: ResponseInit = {}) {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    statusText: init.statusText ?? "",
    text: async () => body,
  } as Response
}

async function loadClient() {
  jest.resetModules()
  jest.doMock("server-only", () => ({}), { virtual: true })
  return import("@/lib/ai/openai-compatible-client")
}

describe("OpenAI-compatible LM Studio client", () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OLLAMA_URL: "http://lm-studio.test/v1",
      AI_MODEL: "mistralai/mistral-7b-instruct-v0.3",
      AI_FORCE_USER_ASSISTANT_ROLES: "false",
      AI_DEBUG: "false",
      NODE_ENV: "test",
    }
    global.fetch = jest.fn()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    jest.spyOn(console, "log").mockImplementation(() => undefined)
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it("returns choices[0].message.content for a successful response", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: " Hello " } }],
      }),
    )

    const { createChatCompletion } = await loadClient()
    await expect(createChatCompletion([{ role: "user", content: "Say hello" }])).resolves.toBe("Hello")
  })

  it("sends a minimal OpenAI-compatible request body", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: "ok" } }],
      }),
    )

    const { createChatCompletion } = await loadClient()
    await createChatCompletion(
      [
        { role: "system", content: "rules" },
        { role: "user", content: "question" },
      ],
      { temperature: 0.2 },
    )

    expect(global.fetch).toHaveBeenCalledWith(
      "http://lm-studio.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      }),
    )

    const body = JSON.parse(String(jest.mocked(global.fetch).mock.calls[0][1]?.body))
    expect(body).toEqual({
      model: "mistralai/mistral-7b-instruct-v0.3",
      messages: [
        { role: "system", content: "rules" },
        { role: "user", content: "question" },
      ],
      temperature: 0.2,
      stream: false,
    })
    expect(body).not.toHaveProperty("prompt")
    expect(body).not.toHaveProperty("options")
    expect(body).not.toHaveProperty("tools")
  })

  it("throws non_2xx for provider 400 responses and logs the provider body", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(textResponse("bad payload", { status: 400, statusText: "Bad Request" }))

    const { AIClientError, createChatCompletion } = await loadClient()
    const promise = createChatCompletion([{ role: "user", content: "Say hello" }])
    await expect(promise).rejects.toMatchObject({
      name: "AIClientError",
      code: "non_2xx",
      status: 400,
    })
    await promise.catch((error) => expect(error).toBeInstanceOf(AIClientError))
  })

  it("throws empty_response for empty choices or blank message content", async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ choices: [] }))
    const { createChatCompletion } = await loadClient()

    await expect(createChatCompletion([{ role: "user", content: "Say hello" }])).rejects.toMatchObject({
      code: "invalid_response",
    })

    jest.mocked(global.fetch).mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: " " } }] }))
    await expect(createChatCompletion([{ role: "user", content: "Say hello" }])).rejects.toMatchObject({
      code: "empty_response",
    })
  })

  it("throws missing_config when OLLAMA_URL or AI_MODEL is missing", async () => {
    delete process.env.OLLAMA_URL
    const { createChatCompletion } = await loadClient()
    await expect(createChatCompletion([{ role: "user", content: "Say hello" }])).rejects.toMatchObject({
      code: "missing_config",
    })

    process.env.OLLAMA_URL = "http://lm-studio.test/v1"
    delete process.env.AI_MODEL
    const reloaded = await loadClient()
    await expect(reloaded.createChatCompletion([{ role: "user", content: "Say hello" }])).rejects.toMatchObject({
      code: "missing_config",
    })
  })

  it("throws timeout when the provider request is aborted", async () => {
    jest.useFakeTimers()
    jest.mocked(global.fetch).mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted")
            error.name = "AbortError"
            reject(error)
          })
        }),
    )

    const { createChatCompletion } = await loadClient()
    const promise = createChatCompletion([{ role: "user", content: "Say hello" }], { timeoutMs: 5 })
    jest.advanceTimersByTime(5)

    await expect(promise).rejects.toMatchObject({ code: "timeout" })
  })

  it("throws network_error for fetch failures", async () => {
    jest.mocked(global.fetch).mockRejectedValueOnce(new TypeError("network down"))
    const { createChatCompletion } = await loadClient()

    await expect(createChatCompletion([{ role: "user", content: "Say hello" }])).rejects.toMatchObject({
      code: "network_error",
    })
  })
})
