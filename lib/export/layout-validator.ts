export type LayoutBlockType = "title" | "text" | "table" | "chart" | "qr" | "footer"

export type LayoutBlock = {
  id: string
  type: LayoutBlockType
  page: number
  x: number
  y: number
  width: number
  height: number
}

export type LayoutPage = {
  width: number
  height: number
  margin: number
  footerHeight: number
}

export type LayoutValidationIssue = {
  code: "outside_bounds" | "negative_coordinates" | "overlap" | "footer_collision" | "qr_collision"
  blockId: string
  otherBlockId?: string
  message: string
}

export type LayoutValidationResult = {
  ok: boolean
  issues: LayoutValidationIssue[]
}

export const A4_PORTRAIT: LayoutPage = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  footerHeight: 90,
}

export const A4_LANDSCAPE: LayoutPage = {
  width: 841.89,
  height: 595.28,
  margin: 48,
  footerHeight: 90,
}

export function validateLayout(blocks: LayoutBlock[], page: LayoutPage = A4_PORTRAIT): LayoutValidationResult {
  const issues: LayoutValidationIssue[] = []

  for (const block of blocks) {
    if (block.x < 0 || block.y < 0 || block.width < 0 || block.height < 0) {
      issues.push({
        code: "negative_coordinates",
        blockId: block.id,
        message: "Layout block contains negative coordinates or size.",
      })
    }

    if (block.x + block.width > page.width || block.y + block.height > page.height || block.x < 0 || block.y < 0) {
      issues.push({
        code: "outside_bounds",
        blockId: block.id,
        message: "Layout block is outside page bounds.",
      })
    }

    if (block.type !== "footer" && block.y + block.height > page.height - page.margin - page.footerHeight) {
      issues.push({
        code: "footer_collision",
        blockId: block.id,
        message: "Layout block collides with footer area.",
      })
    }
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const current = blocks[index]
    for (let nextIndex = index + 1; nextIndex < blocks.length; nextIndex += 1) {
      const other = blocks[nextIndex]
      if (current.page !== other.page) continue
      if (!rectanglesOverlap(current, other)) continue

      const qrCollision = current.type === "qr" || other.type === "qr"
      issues.push({
        code: qrCollision ? "qr_collision" : "overlap",
        blockId: current.id,
        otherBlockId: other.id,
        message: qrCollision ? "QR code overlaps another block." : "Layout blocks overlap.",
      })
    }
  }

  return { ok: issues.length === 0, issues }
}

export function paginateBlocks(
  blocks: Array<Omit<LayoutBlock, "page" | "x" | "y">>,
  page: LayoutPage = A4_PORTRAIT,
): LayoutBlock[] {
  let currentPage = 1
  let cursorY = page.margin

  return blocks.map((block) => {
    if (cursorY + block.height > page.height - page.margin - page.footerHeight) {
      currentPage += 1
      cursorY = page.margin
    }

    const placed: LayoutBlock = {
      ...block,
      page: currentPage,
      x: page.margin,
      y: cursorY,
      width: Math.min(block.width, page.width - page.margin * 2),
    }
    cursorY += block.height + 12
    return placed
  })
}

export function rectanglesOverlap(a: LayoutBlock, b: LayoutBlock) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}
