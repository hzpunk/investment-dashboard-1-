import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@/contexts/i18n-context"
import { AIAssistant } from "@/components/ai-assistant"
import { ApiClientError } from "@/lib/api-client"

const mockApiFetch = jest.fn()

jest.mock("@/lib/api-client", () => {
  const actual = jest.requireActual("@/lib/api-client")
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  }
})

function renderAssistant() {
  return render(
    <I18nProvider>
      <AIAssistant />
    </I18nProvider>,
  )
}

function openAssistant() {
  fireEvent.click(screen.getByRole("button", { name: "Открыть AI-ассистента" }))
}

describe("AIAssistant", () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it("renders empty state and quick prompts after opening", () => {
    renderAssistant()
    openAssistant()

    expect(screen.getAllByText("AI-ассистент по инвестициям")).toHaveLength(2)
    expect(screen.getByText("Помогу проанализировать активы, риски, доходность и структуру портфеля.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Проанализируй мой портфель" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Какой сейчас курс биткоина?" })).toBeInTheDocument()
  })

  it("disables send button when input is empty and enables it when text is entered", () => {
    renderAssistant()
    openAssistant()

    const input = screen.getByPlaceholderText("Спросите что-нибудь о портфеле...")
    const send = screen.getByRole("button", { name: "Отправить" })

    expect(send).toBeDisabled()
    fireEvent.change(input, { target: { value: "Say hello" } })
    expect(send).toBeEnabled()
  })

  it("sends with Enter but not with Shift+Enter", async () => {
    mockApiFetch.mockResolvedValueOnce({ message: "Привет", timestamp: new Date().toISOString() })
    renderAssistant()
    openAssistant()

    const input = screen.getByPlaceholderText("Спросите что-нибудь о портфеле...")
    fireEvent.change(input, { target: { value: "Первая строка" } })
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true })
    expect(mockApiFetch).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: "Enter", shiftKey: false })
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1))
    expect(mockApiFetch.mock.calls[0][0]).toBe("/api/ai/chat")
  })

  it("shows loading state and assistant response", async () => {
    let resolveResponse: (value: unknown) => void
    mockApiFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResponse = resolve
      }),
    )
    renderAssistant()
    openAssistant()

    fireEvent.change(screen.getByPlaceholderText("Спросите что-нибудь о портфеле..."), {
      target: { value: "Say hello" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }))

    expect(screen.getByText("AI думает...")).toBeInTheDocument()
    resolveResponse!({
      message: "Здравствуйте",
      contextStatus: { portfolio: "available", accounts: "available", marketData: "partial" },
      timestamp: new Date().toISOString(),
    })

    await waitFor(() => expect(screen.getByText("Здравствуйте")).toBeInTheDocument())
    expect(screen.getByText("Данные портфеля подключены")).toBeInTheDocument()
    expect(screen.getByText("Данные счетов подключены")).toBeInTheDocument()
  })

  it("displays localized API errors inline", async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiClientError("Provider down", "AI_PROVIDER_UNAVAILABLE", 503))
    renderAssistant()
    openAssistant()

    fireEvent.change(screen.getByPlaceholderText("Спросите что-нибудь о портфеле..."), {
      target: { value: "Say hello" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }))

    await waitFor(() =>
      expect(
        screen.getByText("AI-ассистент временно недоступен. Проверьте подключение к локальной модели."),
      ).toBeInTheDocument(),
    )
  })

  it("does not call the Tailscale or LM Studio URL directly", async () => {
    mockApiFetch.mockResolvedValueOnce({ message: "ok", timestamp: new Date().toISOString() })
    renderAssistant()
    openAssistant()

    fireEvent.change(screen.getByPlaceholderText("Спросите что-нибудь о портфеле..."), {
      target: { value: "Say hello" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }))

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled())
    const [url] = mockApiFetch.mock.calls[0]
    expect(url).toBe("/api/ai/chat")
    expect(JSON.stringify(mockApiFetch.mock.calls)).not.toContain("100.91.135.114")
    expect(JSON.stringify(mockApiFetch.mock.calls)).not.toContain("11434")
  })
})
