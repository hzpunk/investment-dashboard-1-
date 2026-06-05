import {
  buildProjectionScenarios,
  calculateCompoundInterest,
  calculateFutureValueWithContributions,
  calculateInflationAdjustedValue,
  calculateMonthlyContributionForTarget,
  calculateMonthsToTarget,
} from "@/lib/finance/projections"

describe("finance projections", () => {
  it("calculates compound interest", () => {
    expect(calculateCompoundInterest(1000, 12, 12)).toBeCloseTo(1126.83, 2)
  })

  it("calculates future value with contributions and zero interest", () => {
    expect(calculateFutureValueWithContributions(1000, 100, 0, 12)).toBe(2200)
    expect(calculateFutureValueWithContributions(1000, 100, 12, 12)).toBeCloseTo(2395.08, 2)
  })

  it("calculates target monthly contribution and months to target", () => {
    expect(calculateMonthlyContributionForTarget(2200, 1000, 0, 12)).toBe(100)
    expect(calculateMonthsToTarget(2200, 1000, 100, 0)).toBe(12)
    expect(calculateMonthsToTarget(2200, 1000, 0, 0)).toBeNull()
  })

  it("builds projection scenarios with inflation adjustment", () => {
    expect(calculateInflationAdjustedValue(1100, 10, 12)).toBeCloseTo(995.73, 2)
    const scenarios = buildProjectionScenarios({
      principal: 1000,
      monthlyContribution: 100,
      annualRatePercent: 6,
      inflationRatePercent: 3,
      months: 24,
    })

    expect(scenarios.map((scenario) => scenario.id)).toEqual(["conservative", "base", "optimistic"])
    expect(scenarios[1].points).toHaveLength(25)
    expect(scenarios[2].finalValue).toBeGreaterThan(scenarios[0].finalValue)
  })
})
