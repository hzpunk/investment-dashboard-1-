import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { CbrRatesWidget } from "@/components/cbr-rates-widget"
import { I18nProvider } from "@/contexts/i18n-context"
import { apiFetch } from "@/lib/api-client"

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(),
}))

const mockApiFetch = apiFetch as jest.Mock

function renderWidget() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <CbrRatesWidget />
      </QueryClientProvider>
    </I18nProvider>,
  )
}

describe("CbrRatesWidget", () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it("renders CBR exchange rates", async () => {
    mockApiFetch.mockResolvedValueOnce({
      base: "RUB",
      date: "2026-06-06",
      dateFormatted: "06.06.2026",
      source: "CBR",
      stale: false,
      rates: [
        { currency: "USD", nominal: 1, value: 90, rubPerUnit: 90, stale: false },
        { currency: "EUR", nominal: 1, value: 100, rubPerUnit: 100, stale: false },
      ],
    })

    renderWidget()

    await waitFor(() => expect(screen.getByText("USD/RUB")).toBeInTheDocument())
    expect(screen.getByText("EUR/RUB")).toBeInTheDocument()
    expect(screen.getByText(/06\.06\.2026/)).toBeInTheDocument()
    expect(mockApiFetch).toHaveBeenCalledWith("/api/currency/rates?symbols=USD%2CEUR%2CCNY")
  })
})
