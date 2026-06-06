import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { I18nProvider } from "@/contexts/i18n-context"
import { CurrencyProvider } from "@/contexts/currency-context"
import { useDisplayCurrency } from "@/hooks/use-display-currency"
import { displayCurrencyStorageKey } from "@/lib/currency/display-currency"

function Probe() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency()
  return (
    <div>
      <span data-testid="currency">{displayCurrency}</span>
      <button type="button" onClick={() => setDisplayCurrency("EUR")}>
        EUR
      </button>
    </div>
  )
}

function renderProbe() {
  return render(
    <I18nProvider>
      <CurrencyProvider>
        <Probe />
      </CurrencyProvider>
    </I18nProvider>,
  )
}

describe("display currency context", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("defaults to RUB for Russian locale", () => {
    renderProbe()
    expect(screen.getByTestId("currency")).toHaveTextContent("RUB")
  })

  it("persists selected display currency", () => {
    renderProbe()
    fireEvent.click(screen.getByRole("button", { name: "EUR" }))

    expect(screen.getByTestId("currency")).toHaveTextContent("EUR")
    expect(window.localStorage.getItem(displayCurrencyStorageKey)).toBe("EUR")
  })

  it("uses stored display currency on mount", async () => {
    window.localStorage.setItem(displayCurrencyStorageKey, "USD")
    renderProbe()
    await waitFor(() => expect(screen.getByTestId("currency")).toHaveTextContent("USD"))
  })
})
