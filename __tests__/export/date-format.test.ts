import { formatDate, formatDateForFileName, formatDateTime } from "@/lib/format/date"

describe("export date formatting", () => {
  const value = "2026-06-04T15:27:44.096Z"

  it("formats Russian dates as DD.MM.YYYY", () => {
    expect(formatDate(value, "ru")).toBe("04.06.2026")
    expect(formatDateTime(value, "ru")).toBe("04.06.2026 15:27")
  })

  it("formats English dates as MM.DD.YYYY", () => {
    expect(formatDate(value, "en")).toBe("06.04.2026")
    expect(formatDateTime(value, "en")).toBe("06.04.2026 15:27")
  })

  it("formats dates for filenames", () => {
    expect(formatDateForFileName(value)).toBe("2026-06-04")
  })
})
