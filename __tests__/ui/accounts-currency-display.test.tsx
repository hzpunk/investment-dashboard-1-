import type React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import AccountsPage from "@/app/(dashboard)/accounts/page"

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@example.com", username: "user", role: "user" },
  }),
}))

jest.mock("@/contexts/i18n-context", () => ({
  useI18n: () => ({
    locale: "ru",
    t: (key: string) => translations[key] ?? key,
  }),
}))

jest.mock("@/hooks/use-selected-account", () => ({
  useSelectedAccount: () => ({
    scope: { type: "all" },
    selectedAccount: null,
    setSelectedAccountId: jest.fn(),
  }),
}))

jest.mock("@/hooks/use-display-currency", () => ({
  useDisplayCurrency: () => ({
    displayCurrency: "RUB",
    setDisplayCurrency: jest.fn(),
  }),
}))

jest.mock("@/components/dashboard-header", () => ({
  DashboardHeader: ({ heading, text, children }: { heading: string; text?: string; children?: React.ReactNode }) => (
    <header>
      <h1>{heading}</h1>
      {text ? <p>{text}</p> : null}
      {children}
    </header>
  ),
}))

jest.mock("@/components/account-switcher", () => ({
  AccountSwitcher: () => <div>Все счета</div>,
}))

jest.mock("@/entities/account/api", () => ({
  createAccount: jest.fn(),
  deleteAccount: jest.fn(),
}))

jest.mock("@/entities/currency/api", () => ({
  fetchCurrencyRates: jest.fn(async () => ({
    base: "RUB",
    date: "2026-06-06",
    dateFormatted: "06.06.2026",
    source: "CBR",
    stale: false,
    rates: [{ currency: "USD", nominal: 1, value: 90, rubPerUnit: 90, stale: false }],
  })),
}))

jest.mock("@/lib/query-options", () => ({
  accountsQuery: () => ({
    queryKey: ["accounts", "user-1"],
    queryFn: async () => [
      {
        id: "acc-1",
        userId: "user-1",
        name: "Demo Brokerage",
        type: "brokerage",
        balance: 21588.75,
        currency: "USD",
        createdAt: "2026-06-06T00:00:00.000Z",
      },
    ],
  }),
  transactionsQuery: () => ({
    queryKey: ["transactions", "user-1"],
    queryFn: async () => [],
  }),
  analyticsQuery: () => ({
    queryKey: ["analytics", "user-1", "RUB"],
    queryFn: async () => ({
      summary: {
        totalPortfolioValue: 0,
        totalPnL: 0,
        assetCount: 0,
        diversificationScore: 0,
      },
      currency: { baseCurrency: "RUB", conversionStatus: "converted", stale: false },
    }),
  }),
  marketDataCache: {},
  queryKeys: {
    accounts: () => ["accounts", "user-1"],
  },
}))

const translations: Record<string, string> = {
  "accounts.title": "Счета",
  "accounts.description": "Управляйте счетами",
  "accounts.activeAccount": "Активный счёт",
  "accounts.activeAccountDescription": "Текущий срез",
  "accounts.allAccounts": "Все счета",
  "accounts.allAccountsDescription": "Все счета",
  "accounts.scopeValue": "Стоимость",
  "accounts.transactions": "Транзакции",
  "accounts.assetsCount": "Активы",
  "accounts.lastTransaction": "Последняя транзакция",
  "accounts.searchPlaceholder": "Поиск",
  "accounts.noAccounts": "Нет счетов",
  "accounts.noAccountsBySearch": "Нет счетов",
  "accounts.confirmDelete": "Удалить?",
  "accounts.selectAccount": "Выбрать",
  "accounts.exportAccount": "Экспорт",
  "accounts.openAnalytics": "Аналитика",
  "accounts.openDashboard": "Дашборд",
  "accounts.addDialogTitle": "Добавить счёт",
  "accounts.addDialogDescription": "Новый счёт",
  "accounts.selectAccountType": "Тип",
  "actions.addAccount": "Добавить счёт",
  "actions.addTransaction": "Добавить транзакцию",
  "common.name": "Название",
  "common.type": "Тип",
  "common.amount": "Сумма",
  "common.currency": "Валюта",
  "common.actions": "Действия",
  "common.notAvailable": "Нет данных",
  "common.cancel": "Отмена",
  "common.loading": "Загрузка",
  "common.edit": "Редактировать",
  "common.delete": "Удалить",
  "accountType.brokerage": "Брокерский счёт",
  "accountType.bank": "Банк",
  "accountType.crypto": "Крипто",
  "accountType.retirement": "Пенсионный",
  "accountType.other": "Другое",
  "transactions.selectCurrency": "Валюта",
  "analytics.summary.totalPnl": "P&L",
  "analytics.summary.diversificationScore": "Диверсификация",
  "currency.rates.unavailableShort": "Курс недоступен",
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AccountsPage />
    </QueryClientProvider>,
  )
}

describe("accounts currency display", () => {
  it("shows USD account balance with converted RUB equivalent and does not relabel the amount", async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText("Demo Brokerage")).toBeInTheDocument())
    await waitFor(() => {
      const text = (document.body.textContent ?? "").replace(/\u00a0/g, " ")
      expect(text).toContain("21 588,75")
      expect(text).toContain("$")
      expect(text).toContain("1 942 987,50")
      expect(text).toContain("₽")
      expect(text).not.toContain("21 588,75 ₽")
    })
  })
})
