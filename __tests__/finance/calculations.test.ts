import {
  calculateAllocationPercent,
  calculateAssetMarketValue,
  calculateCagrPercent,
  calculateMaxDrawdownPercent,
  calculatePnLPercent,
  calculateSimpleReturnPercent,
  calculateUnrealizedPnL,
  calculateVolatilityPercent,
} from "@/lib/finance/calculations"
import { calculatePortfolioMetrics } from "@/lib/finance/portfolio-metrics"

describe("finance calculations", () => {
  it("calculates market value, PnL and allocation safely", () => {
    expect(calculateAssetMarketValue(10, 25)).toBe(250)
    expect(calculateUnrealizedPnL(10, 25, 20)).toBe(50)
    expect(calculatePnLPercent(50, 200)).toBe(25)
    expect(calculateAllocationPercent(25, 100)).toBe(25)
  })

  it("guards division by zero and invalid inputs", () => {
    expect(calculateAssetMarketValue(-10, 25)).toBe(0)
    expect(calculatePnLPercent(50, 0)).toBe(0)
    expect(calculateAllocationPercent(10, 0)).toBe(0)
    expect(calculateSimpleReturnPercent(0, 100)).toBe(0)
    expect(calculateCagrPercent(0, 100, 2)).toBeNull()
  })

  it("calculates return, CAGR, volatility and drawdown", () => {
    expect(calculateSimpleReturnPercent(1000, 1250)).toBe(25)
    expect(calculateCagrPercent(1000, 1210, 2)).toBeCloseTo(10, 5)
    expect(calculateVolatilityPercent([1, 2, 3])).toBeCloseTo(1, 5)
    expect(calculateMaxDrawdownPercent([100, 120, 90, 130])).toBeCloseTo(25, 5)
  })

  it("calculates portfolio metrics from real positions and transactions", () => {
    const metrics = calculatePortfolioMetrics(
      [
        {
          assetId: "aapl",
          symbol: "AAPL",
          name: "Apple",
          type: "stock",
          quantity: 10,
          currentPrice: 120,
          averageBuyPrice: 100,
          currency: "USD",
          updatedAt: new Date(),
        },
        {
          assetId: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          type: "crypto",
          quantity: 1,
          currentPrice: 500,
          averageBuyPrice: 700,
          currency: "USD",
          updatedAt: new Date(),
        },
      ],
      [
        {
          assetId: "aapl",
          type: "buy",
          quantity: 10,
          pricePerUnit: 100,
          totalAmount: 1000,
          fee: 0,
          date: "2026-01-01T00:00:00.000Z",
        },
      ],
      [{ balance: 300, currency: "USD" }],
    )

    expect(metrics.totalPortfolioValue).toBe(1700)
    expect(metrics.totalInvestedAmount).toBe(1700)
    expect(metrics.unrealizedPnL).toBe(0)
    expect(metrics.cashBalance).toBe(300)
    expect(metrics.allocationByType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "stock", percent: expect.any(Number) }),
        expect.objectContaining({ key: "crypto", percent: expect.any(Number) }),
      ]),
    )
    expect(metrics.largestPosition?.symbol).toBe("AAPL")
  })
})
