import { containsInternalExportLeak, sanitizeExportData } from "@/lib/export/presentation/sanitize-export-data"
import { tableSections } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("export sanitization", () => {
  it("removes internal ids and keys from user-facing rows", () => {
    const internalId = "cmpzng1cv0003rk28vwl9a6cq"
    const cleaned = sanitizeExportData({
      id: internalId,
      assetId: internalId,
      userId: internalId,
      key: internalId,
      name: "BTC",
      nested: { portfolioId: internalId, value: internalId },
    })

    expect(JSON.stringify(cleaned)).toBe(JSON.stringify({ name: "BTC", nested: { value: "" } }))
    expect(containsInternalExportLeak(cleaned)).toBe(false)
  })

  it("does not export allocation database keys in rendered sections", () => {
    const base = sampleExportBundle()
    const sections = tableSections(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          selectedSections: ["allocationChart"],
        },
        allocationChart: {
          totalValue: 8160,
          assetCount: 1,
          byType: [],
          byAsset: [{ key: "cmpzng1cv0003rk28vwl9a6cq", label: "BTC", value: 8160, percent: 37.8, count: 1 }],
          byCurrency: [],
          bySector: [],
        },
      }),
    )

    const renderedRows = JSON.stringify(sections.flatMap((section) => section.rows))
    expect(renderedRows).toContain("BTC")
    expect(renderedRows).toContain("37.8%")
    expect(renderedRows).not.toContain("cmpzng1cv0003rk28vwl9a6cq")
    expect(renderedRows).not.toContain("\"key\"")
    expect(renderedRows).not.toContain("\"count\"")
  })
})
