import { fireEvent, render, screen } from "@testing-library/react"
import { CurrencySwitcher } from "@/components/currency-switcher"
import { I18nProvider } from "@/contexts/i18n-context"
import { CurrencyProvider } from "@/contexts/currency-context"

jest.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react")
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div role="menu">{children}</div>,
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children: React.ReactNode
      onClick?: React.MouseEventHandler<HTMLButtonElement>
    }) => (
      <button type="button" role="menuitem" onClick={onClick}>
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
  }
})

function renderSwitcher() {
  return render(
    <I18nProvider>
      <CurrencyProvider>
        <CurrencySwitcher />
      </CurrencyProvider>
    </I18nProvider>,
  )
}

describe("CurrencySwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("renders current display currency and switches to USD", async () => {
    renderSwitcher()

    const trigger = screen.getAllByRole("button")[0]
    expect(trigger).toHaveTextContent("RUB")

    fireEvent.click(await screen.findByRole("menuitem", { name: /USD/ }))

    expect(screen.getAllByRole("button")[0]).toHaveTextContent("USD")
  })
})
