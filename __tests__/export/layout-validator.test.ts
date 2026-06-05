import { A4_PORTRAIT, paginateBlocks, validateLayout, type LayoutBlock } from "@/lib/export/layout-validator"

describe("export layout validator", () => {
  it("detects overlapping blocks", () => {
    const blocks: LayoutBlock[] = [
      { id: "a", type: "text", page: 1, x: 10, y: 10, width: 100, height: 100 },
      { id: "b", type: "qr", page: 1, x: 50, y: 50, width: 100, height: 100 },
    ]

    const result = validateLayout(blocks)

    expect(result.ok).toBe(false)
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "qr_collision" })]))
  })

  it("detects blocks outside page bounds", () => {
    const result = validateLayout([{ id: "bad", type: "table", page: 1, x: 0, y: 0, width: 900, height: 10 }])

    expect(result.ok).toBe(false)
    expect(result.issues[0].code).toBe("outside_bounds")
  })

  it("allows reserved QR block beside link text", () => {
    const result = validateLayout([
      { id: "link", type: "text", page: 1, x: 48, y: 120, width: 380, height: 56 },
      { id: "qr", type: "qr", page: 1, x: 475, y: 128, width: 72, height: 72 },
      { id: "footer", type: "footer", page: 1, x: 48, y: 807, width: 499, height: 10 },
    ], A4_PORTRAIT)

    expect(result.ok).toBe(true)
  })

  it("detects table collision with reserved footer area", () => {
    const result = validateLayout([{ id: "table", type: "table", page: 1, x: 48, y: 690, width: 400, height: 80 }], A4_PORTRAIT)

    expect(result.ok).toBe(false)
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "footer_collision" })]))
  })

  it("paginates blocks before footer collision", () => {
    const blocks = paginateBlocks([
      { id: "one", type: "table", width: 400, height: 600 },
      { id: "two", type: "table", width: 400, height: 120 },
    ], A4_PORTRAIT)

    expect(blocks[0].page).toBe(1)
    expect(blocks[1].page).toBe(2)
  })
})
