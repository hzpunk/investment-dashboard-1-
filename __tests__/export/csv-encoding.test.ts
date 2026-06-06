import { generateCsvExport } from "@/lib/export/generators/tabular"
import { sampleExportBundle } from "@/test-utils/export-bundle"

describe("CSV Excel encoding", () => {
  it("starts with UTF-8 BOM and keeps Russian text readable", () => {
    const base = sampleExportBundle()
    const file = generateCsvExport(
      sampleExportBundle({
        metadata: {
          ...base.metadata,
          format: "csv",
          language: "ru",
          selectedSections: ["portfolioSummary", "accounts"],
          options: { ...base.metadata.options, language: "ru" },
        },
      }),
    )

    const csv = String(file.body)
    expect(file.contentType).toBe("text/csv; charset=utf-8")
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain("Сводка портфеля")
    expect(csv).toContain("Стоимость портфеля")
    expect(csv).toContain("Вложено")
    expect(csv).toContain("Свободные средства")
    expect(csv).toContain("Название;Тип;Баланс в валюте счёта;Валюта счёта;Валюта отображения;Дата создания")
    expect(csv).not.toContain("РЎРІРѕРґРєР°")
    expect(csv).not.toContain("РЎС‚РѕРёРјРѕСЃС‚СЊ")
    expect(csv).not.toContain("Р’Р»РѕР¶РµРЅРѕ")
    expect(csv).not.toContain("В $")
    expect(csv).not.toContain("\u00A0")
    expect(csv).not.toContain("\u202F")
  })
})
