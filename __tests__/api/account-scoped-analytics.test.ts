jest.mock("server-only", () => ({}), { virtual: true })

jest.mock("@/lib/prisma", () => ({
  prisma: {
    portfolioAsset: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    account: { findMany: jest.fn() },
    portfolio: { count: jest.fn() },
  },
}))

jest.mock("@/lib/currency/rates", () => ({
  getCbrCurrencyRates: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import { buildAnalyticsDto } from "@/lib/services/analytics"

const mockedPrisma = prisma as jest.Mocked<typeof prisma>
const portfolioAssetFindMany = mockedPrisma.portfolioAsset.findMany as unknown as jest.Mock
const transactionFindMany = mockedPrisma.transaction.findMany as unknown as jest.Mock
const accountFindMany = mockedPrisma.account.findMany as unknown as jest.Mock
const portfolioCount = mockedPrisma.portfolio.count as unknown as jest.Mock

describe("account-scoped analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    portfolioAssetFindMany.mockResolvedValue([])
    transactionFindMany.mockResolvedValue([])
    accountFindMany.mockResolvedValue([])
    portfolioCount.mockResolvedValue(0)
  })

  it("filters transactions and accounts by selected account", async () => {
    const fromDate = new Date("2026-01-01T00:00:00.000Z")
    const toDate = new Date("2026-06-06T00:00:00.000Z")

    const analytics = await buildAnalyticsDto("user-1", {
      fromDate,
      toDate,
      accountScope: { type: "single", accountId: "acc-1" },
    })

    expect(transactionFindMany.mock.calls[0][0].where).toMatchObject({
      userId: "user-1",
      accountId: "acc-1",
      date: { lte: toDate },
    })
    expect(accountFindMany.mock.calls[0][0].where).toEqual({ userId: "user-1", id: "acc-1" })
    expect(portfolioAssetFindMany.mock.calls[0][0].where).toMatchObject({
      portfolioId: "__account_scoped_positions_are_transaction_derived__",
      portfolio: { userId: "user-1" },
    })
    expect(analytics.accountScope).toEqual({
      type: "single",
      accountId: "acc-1",
      key: "account:acc-1",
    })
  })

  it("aggregates all accounts when no single account is selected", async () => {
    const fromDate = new Date("2026-01-01T00:00:00.000Z")
    const toDate = new Date("2026-06-06T00:00:00.000Z")

    const analytics = await buildAnalyticsDto("user-1", {
      fromDate,
      toDate,
      accountScope: { type: "all" },
    })

    expect(transactionFindMany.mock.calls[0][0].where).not.toHaveProperty("accountId")
    expect(accountFindMany.mock.calls[0][0].where).toEqual({ userId: "user-1" })
    expect(portfolioAssetFindMany.mock.calls[0][0].where).not.toHaveProperty("portfolioId")
    expect(analytics.accountScope).toEqual({
      type: "all",
      accountId: null,
      key: "all",
    })
  })

  it("uses requested display currency as analytics base currency", async () => {
    const analytics = await buildAnalyticsDto("user-1", {
      fromDate: new Date("2026-01-01T00:00:00.000Z"),
      toDate: new Date("2026-06-06T00:00:00.000Z"),
      accountScope: { type: "all" },
      displayCurrency: "USD",
    })

    expect(analytics.currency.baseCurrency).toBe("USD")
  })
})
