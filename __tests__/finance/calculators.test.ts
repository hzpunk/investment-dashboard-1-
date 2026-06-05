import {
  calculateAllocationPercentage,
  calculateAveragePurchasePrice,
  calculateBreakEvenPoint,
  calculateDividendIncome,
  calculateInvestmentProfitTax,
  calculateLoanOverpayment,
  calculateMarginAndMarkup,
  calculateMortgageAnnuityPayment,
  calculateProfitLoss,
  calculateRiskPositionSize,
  calculateRoiPercent,
  calculateVatAdd,
  calculateVatExtract,
} from "@/lib/finance/calculators"

describe("finance calculators", () => {
  it("calculates VAT add and extract", () => {
    expect(calculateVatAdd(100, 20)).toEqual({ base: 100, vat: 20, total: 120 })
    expect(calculateVatExtract(120, 20)).toEqual({ base: 100, vat: 20, total: 120 })
  })

  it("calculates margin, markup, ROI and break-even", () => {
    expect(calculateMarginAndMarkup(80, 100)).toEqual({ profit: 20, marginPercent: 20, markupPercent: 25 })
    expect(calculateRoiPercent(1000, 1250)).toBe(25)
    expect(calculateBreakEvenPoint(1000, 25, 15)).toEqual({
      units: 100,
      revenue: 2500,
      contributionMargin: 10,
    })
    expect(calculateBreakEvenPoint(1000, 10, 15).units).toBeNull()
  })

  it("calculates mortgage annuity payment and overpayment", () => {
    expect(calculateMortgageAnnuityPayment(100000, 0, 100)).toBe(1000)
    expect(calculateMortgageAnnuityPayment(100000, 6, 360)).toBeCloseTo(599.55, 2)
    expect(calculateLoanOverpayment(100000, 0, 100)).toEqual({
      monthlyPayment: 1000,
      totalPaid: 100000,
      overpayment: 0,
    })
  })

  it("calculates investment and asset formulas", () => {
    expect(calculateAveragePurchasePrice(10, 100, 10, 120)).toBe(110)
    expect(calculateProfitLoss(10, 100, 120, 10)).toEqual({
      cost: 1010,
      proceeds: 1200,
      pnl: 190,
      pnlPercent: 18.81,
    })
    expect(calculateDividendIncome(100, 2, 13, 4)).toEqual({ gross: 800, tax: 104, net: 696 })
    expect(calculateAllocationPercentage(25, 100)).toBe(25)
    expect(calculateRiskPositionSize(10000, 1, 50, 45)).toEqual({
      riskAmount: 100,
      quantity: 20,
      positionValue: 1000,
    })
    expect(calculateInvestmentProfitTax(1000, 13)).toEqual({
      taxableProfit: 1000,
      tax: 130,
      netProfit: 870,
    })
  })
})
