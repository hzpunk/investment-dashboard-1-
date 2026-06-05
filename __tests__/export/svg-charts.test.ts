import { generateAllocationSvgChart, generatePerformanceSvgChart } from "@/lib/export/charts/svg-charts"

describe("export SVG charts", () => {
  it("generates an allocation SVG when data exists", () => {
    const chart = generateAllocationSvgChart([
      { label: "Акции", value: 7000, percent: 70 },
      { label: "Облигации", value: 3000, percent: 30 },
    ])

    expect(chart?.svg).toContain("<svg")
    expect(chart?.svg).toContain("Акции")
    expect(chart?.width).toBeGreaterThan(0)
  })

  it("generates a performance SVG when at least two points exist", () => {
    const chart = generatePerformanceSvgChart([
      { date: "2026-06-01T00:00:00.000Z", portfolioValue: 1000, investedAmount: 900 },
      { date: "2026-06-04T00:00:00.000Z", portfolioValue: 1200, investedAmount: 950 },
    ])

    expect(chart?.svg).toContain("<path")
    expect(chart?.height).toBeGreaterThan(0)
  })

  it("returns null when chart data is insufficient", () => {
    expect(generatePerformanceSvgChart([{ date: "2026-06-01", portfolioValue: 1000 }])).toBeNull()
    expect(generateAllocationSvgChart([])).toBeNull()
  })
})
