jest.mock("server-only", () => ({}), { virtual: true })

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: { findMany: jest.fn() },
    portfolioAsset: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    asset: { findMany: jest.fn() },
    portfolio: { count: jest.fn() },
  },
}))

jest.mock("@/lib/services/market-data", () => ({
  cryptoIdMap: { BTC: "bitcoin" },
  getCryptoPricesServer: jest.fn(),
}))

jest.mock("@/lib/services/portfolio-summary", () => ({
  getPortfolioSummary: jest.fn(),
}))

jest.mock("@/lib/currency/rates", () => ({
  getCbrCurrencyRates: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import { getCryptoPricesServer } from "@/lib/services/market-data"
import { getPortfolioSummary } from "@/lib/services/portfolio-summary"
import { getCbrCurrencyRates } from "@/lib/currency/rates"
import { buildAIPortfolioContext, getAIContextStatus } from "@/lib/ai/portfolio-context"

const mockedPrisma = prisma as jest.Mocked<typeof prisma>
const mockedGetCryptoPricesServer = getCryptoPricesServer as jest.Mock
const mockedGetPortfolioSummary = getPortfolioSummary as jest.Mock
const mockAccountFindMany = mockedPrisma.account.findMany as unknown as jest.Mock
const mockPortfolioAssetFindMany = mockedPrisma.portfolioAsset.findMany as unknown as jest.Mock
const mockTransactionFindMany = mockedPrisma.transaction.findMany as unknown as jest.Mock
const mockAssetFindMany = mockedPrisma.asset.findMany as unknown as jest.Mock
const mockPortfolioCount = mockedPrisma.portfolio.count as unknown as jest.Mock
const mockGetCbrCurrencyRates = getCbrCurrencyRates as jest.Mock

describe("AI portfolio context", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPortfolioCount.mockResolvedValue(0)
    mockGetCbrCurrencyRates.mockResolvedValue({
      date: "2026-06-06",
      source: "CBR",
      stale: false,
      rates: [{ base: "RUB", quote: "USD", value: 90, nominal: 1, date: "2026-06-06", source: "CBR" }],
    })
  })

  it("builds compact context from accounts, holdings, transactions and market data", async () => {
    const now = new Date()
    mockAccountFindMany.mockResolvedValue([
      { id: "acc-1", name: "Brokerage", type: "brokerage", balance: 1000.123, currency: "USD" },
    ] as never)
    mockedGetPortfolioSummary.mockResolvedValue({
      source: "test",
      holdings: [],
    })
    mockPortfolioAssetFindMany.mockResolvedValue([
      {
        assetId: "asset-btc",
        quantity: 0.5,
        averageBuyPrice: 30000,
        asset: {
          symbol: "BTC",
          name: "Bitcoin",
          type: "crypto",
          currentPrice: 40000,
          currency: "USD",
          updatedAt: now,
        },
      },
    ] as never)
    mockTransactionFindMany.mockImplementation((args: any) => {
      if (args.where?.type) {
        return Promise.resolve([
          {
            assetId: "asset-btc",
            type: "buy",
            quantity: 0.5,
            totalAmount: 15000,
            fee: 10,
            asset: {
              symbol: "BTC",
              name: "Bitcoin",
              type: "crypto",
              currentPrice: 40000,
              currency: "USD",
              updatedAt: now,
            },
          },
        ])
      }

      return Promise.resolve([
        {
          date: now,
          type: "buy",
          quantity: 0.5,
          pricePerUnit: 30000,
          totalAmount: 15000,
          currency: "USD",
          asset: { symbol: "BTC", name: "Bitcoin" },
        },
      ])
    })
    mockedGetCryptoPricesServer.mockResolvedValue({
      success: true,
      data: { bitcoin: { usd: 41000 } },
    })
    mockAssetFindMany.mockResolvedValue([])

    const context = await buildAIPortfolioContext("user-1", "Какой сейчас курс биткоина?")

    expect(context.accounts[0]).toMatchObject({
      id: "acc-1",
      name: "Brokerage",
      type: "brokerage",
      balanceOriginal: { amount: 1000.12, currency: "USD" },
      balanceDisplay: { amount: 90011.07, currency: "RUB" },
      conversionStatus: "converted",
    })
    expect(context.holdings[0]).toMatchObject({
      symbol: "BTC",
      quantity: 0.5,
      currentPrice: 3600000,
      value: 1800000,
      currency: "RUB",
    })
    expect(context.selectedAccountScope.conversionStatus).toBe("converted")
    expect(context.marketData.BTC).toMatchObject({
      status: "available",
      price: 41000,
      source: "provider_or_cache",
    })
    expect(getAIContextStatus(context)).toEqual({
      portfolio: "available",
      accounts: "available",
      marketData: "available",
    })
    expect(JSON.stringify(context)).not.toMatch(/password|token|cookie|secret/i)
    expect(JSON.stringify(context).length).toBeLessThan(12000)
  })

  it("marks empty portfolio and unavailable market data honestly", async () => {
    mockAccountFindMany.mockResolvedValue([])
    mockedGetPortfolioSummary.mockResolvedValue({
      source: "test",
      holdings: [],
    })
    mockPortfolioAssetFindMany.mockResolvedValue([])
    mockTransactionFindMany.mockResolvedValue([])
    mockedGetCryptoPricesServer.mockResolvedValue({ success: false, data: {} })
    mockAssetFindMany.mockResolvedValue([])

    const context = await buildAIPortfolioContext("user-1", "Что у меня с портфелем?")

    expect(context.dataAvailability.accounts).toBe("empty")
    expect(context.dataAvailability.holdings).toBe("empty")
    expect(context.dataAvailability.recentTransactions).toBe("empty")
    expect(context.holdings).toEqual([])
    expect(context.dataAvailability.notes).toContain("No portfolio holdings were found for this user.")
  })

  it("falls back to stale database market data when provider/cache is unavailable", async () => {
    const staleDate = new Date(Date.now() - 60 * 60 * 1000)
    mockAccountFindMany.mockResolvedValue([])
    mockedGetPortfolioSummary.mockResolvedValue({ source: "test", holdings: [] })
    mockPortfolioAssetFindMany.mockResolvedValue([])
    mockTransactionFindMany.mockResolvedValue([])
    mockedGetCryptoPricesServer.mockResolvedValue({ success: false, data: {} })
    mockAssetFindMany.mockResolvedValue([
      { symbol: "BTC", currentPrice: 39000, currency: "USD", updatedAt: staleDate },
    ] as never)

    const context = await buildAIPortfolioContext("user-1", "Какой сейчас курс BTC?")

    expect(context.marketData.BTC).toMatchObject({
      status: "stale",
      lastKnownPrice: 39000,
      note: expect.stringContaining("do not present it as a current market price"),
    })
    expect(context.dataAvailability.marketData).toBe("unavailable")
  })
})
