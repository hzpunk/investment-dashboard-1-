jest.mock("server-only", () => ({}), { virtual: true })

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    account: { findMany: jest.fn() },
    portfolio: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    auditLog: { count: jest.fn(), findMany: jest.fn() },
  },
}))

jest.mock("@/lib/services/analytics", () => ({
  buildAnalyticsDto: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import { buildAnalyticsDto } from "@/lib/services/analytics"
import { collectExportData } from "@/lib/export/collect-export-data"
import { normalizeExportRequest } from "@/lib/export/formatters"

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock }
  account: { findMany: jest.Mock }
  portfolio: { findMany: jest.Mock }
  transaction: { findMany: jest.Mock }
  auditLog: { count: jest.Mock; findMany: jest.Mock }
}
const mockedAnalytics = buildAnalyticsDto as jest.Mock

describe("export data collector", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("collects only safe user-owned export data", async () => {
    const now = new Date("2026-06-04T10:00:00.000Z")
    mockedPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      profile: { username: "User" },
      roles: [{ role: "user" }],
    })
    mockedPrisma.account.findMany.mockResolvedValue([{ name: "Brokerage", type: "brokerage", balance: 1000, currency: "USD", createdAt: now }])
    mockedPrisma.portfolio.findMany.mockResolvedValue([
      {
        name: "Main",
        assets: [{
          quantity: 2,
          averageBuyPrice: 100,
          asset: { symbol: "ABC", name: "ABC Corp", type: "stock", currentPrice: 120, currency: "USD", updatedAt: now },
        }],
      },
    ])
    mockedPrisma.transaction.findMany.mockResolvedValue([
      {
        date: now,
        type: "buy",
        quantity: 2,
        pricePerUnit: 100,
        totalAmount: 200,
        fee: 1,
        currency: "USD",
        notes: "ok",
        account: { name: "Brokerage" },
        asset: { symbol: "ABC", name: "ABC Corp", type: "stock", currentPrice: 120, currency: "USD", updatedAt: now },
      },
    ])
    mockedAnalytics.mockResolvedValue({
      summary: {
        totalPortfolioValue: 1240,
        totalInvested: 200,
        cashBalance: 1000,
        unrealizedPnL: 40,
        realizedPnL: 0,
        totalPnL: 40,
        pnlPercent: 20,
        assetCount: 1,
        largestPosition: null,
        diversificationScore: 10,
        updatedAt: now.toISOString(),
        source: "portfolio_assets",
      },
      performance: { points: [], byPeriod: {}, metrics: {}, hasData: false, emptyReason: "insufficient_data" },
      allocation: { totalValue: 1240, assetCount: 1, byType: [], byAsset: [], byCurrency: [], bySector: [] },
      positions: [],
      risk: { warnings: [] },
      transactionStats: {},
      projectionDefaults: {},
      period: { from: now.toISOString(), to: now.toISOString() },
    })

    const validation = normalizeExportRequest({
      format: "json",
      sections: { portfolioSummary: true, accounts: true, assets: true, holdings: true, transactions: true, auditLogSummary: true },
      options: { title: "Report" },
    }, now)

    expect(validation.ok).toBe(true)
    if (!validation.ok) return

    const bundle = await collectExportData({
      userId: "user-1",
      user: { id: "user-1", email: "user@example.com", role: "user" },
      request: validation.request,
      appUrl: "https://app.example.com",
      qrCodeDataUrl: null,
      qrCodeSvg: null,
    })

    expect(bundle.user.email).toBe("user@example.com")
    expect(bundle.accounts?.[0].name).toBe("Brokerage")
    expect(bundle.holdings?.[0].symbol).toBe("ABC")
    expect(bundle.auditLogSummary).toBeNull()
    expect(bundle.metadata.warnings).toContain("ADMIN_SECTION_SKIPPED:auditLogSummary")
    expect(JSON.stringify(bundle)).not.toMatch(/password|token|secret|cookie|DATABASE_URL/i)
  })
})
