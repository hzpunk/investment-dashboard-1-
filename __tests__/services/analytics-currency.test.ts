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
import { getCbrCurrencyRates } from "@/lib/currency/rates"
import { buildAnalyticsDto } from "@/lib/services/analytics"

const mockedPrisma = prisma as jest.Mocked<typeof prisma>
const mockedRates = getCbrCurrencyRates as jest.Mock
const portfolioAssetFindMany = mockedPrisma.portfolioAsset.findMany as unknown as jest.Mock
const transactionFindMany = mockedPrisma.transaction.findMany as unknown as jest.Mock
const accountFindMany = mockedPrisma.account.findMany as unknown as jest.Mock
const portfolioCount = mockedPrisma.portfolio.count as unknown as jest.Mock

const fromDate = new Date("2026-01-01T00:00:00.000Z")
const toDate = new Date("2026-06-06T00:00:00.000Z")
const ratesResult = {
  date: "2026-06-06",
  source: "CBR" as const,
  stale: false,
  rates: [{ base: "RUB" as const, quote: "USD", value: 90, nominal: 1, date: "2026-06-06", source: "CBR" as const }],
}

function mockEmptyDatabase() {
  portfolioAssetFindMany.mockResolvedValue([])
  transactionFindMany.mockResolvedValue([])
  accountFindMany.mockResolvedValue([])
  portfolioCount.mockResolvedValue(0)
}

describe("analytics currency conversion", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEmptyDatabase()
    mockedRates.mockResolvedValue(ratesResult)
  })

  it("converts USD account cash balance to RUB instead of relabeling it", async () => {
    accountFindMany.mockResolvedValue([{ balance: 21588.75, currency: "USD" }])

    const analytics = await buildAnalyticsDto("user-1", {
      fromDate,
      toDate,
      accountScope: { type: "all" },
      displayCurrency: "RUB",
    })

    expect(analytics.summary.cashBalance).toBe(1942987.5)
    expect(analytics.summary.cashBalance).not.toBe(21588.75)
    expect(analytics.currency.conversionStatus).toBe("converted")
  })

  it("converts transaction-derived asset prices before calculating chart and PnL values", async () => {
    transactionFindMany.mockResolvedValue([
      {
        id: "tx-1",
        assetId: "asset-1",
        type: "buy",
        quantity: 1,
        pricePerUnit: 20000,
        totalAmount: 20000,
        fee: 0,
        currency: "USD",
        date: new Date("2026-06-04T00:00:00.000Z"),
        asset: {
          id: "asset-1",
          symbol: "USDASSET",
          name: "USD Asset",
          type: "stock",
          currentPrice: 21588.75,
          currency: "USD",
          updatedAt: new Date("2026-06-05T00:00:00.000Z"),
        },
      },
    ])

    const analytics = await buildAnalyticsDto("user-1", {
      fromDate,
      toDate,
      accountScope: { type: "single", accountId: "acc-1" },
      displayCurrency: "RUB",
    })

    const lastPoint = analytics.performance.points.at(-1)
    expect(analytics.summary.totalPortfolioValue).toBe(1942987.5)
    expect(analytics.summary.totalInvested).toBe(1800000)
    expect(analytics.summary.totalPnL).toBe(142987.5)
    expect(lastPoint?.portfolioValue).toBe(1942987.5)
    expect(lastPoint?.investedAmount).toBe(1800000)
    expect(analytics.positions[0].currentPrice).toBe(1942987.5)
    expect(analytics.positions[0].currency).toBe("RUB")
  })

  it("marks missing rates unavailable and does not sum raw foreign numbers as display currency", async () => {
    mockedRates.mockResolvedValue(null)
    transactionFindMany.mockResolvedValue([
      {
        id: "tx-1",
        assetId: "asset-1",
        type: "buy",
        quantity: 1,
        pricePerUnit: 20000,
        totalAmount: 20000,
        fee: 0,
        currency: "USD",
        date: new Date("2026-06-04T00:00:00.000Z"),
        asset: {
          id: "asset-1",
          symbol: "USDASSET",
          name: "USD Asset",
          type: "stock",
          currentPrice: 21588.75,
          currency: "USD",
          updatedAt: new Date("2026-06-05T00:00:00.000Z"),
        },
      },
    ])

    const analytics = await buildAnalyticsDto("user-1", {
      fromDate,
      toDate,
      accountScope: { type: "single", accountId: "acc-1" },
      displayCurrency: "RUB",
    })

    expect(analytics.summary.totalPortfolioValue).toBe(0)
    expect(analytics.summary.totalPortfolioValue).not.toBe(21588.75)
    expect(analytics.currency.conversionStatus).toBe("unavailable")
    expect(analytics.currency.warnings).toContain("CURRENCY_RATE_UNAVAILABLE")
  })
})
