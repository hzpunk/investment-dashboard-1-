export const EXPORT_FORMATS = {
  pdf: { implemented: true, category: "document", mimeType: "application/pdf", extension: "pdf" },
  docx: {
    implemented: true,
    category: "document",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  txt: { implemented: true, category: "document", mimeType: "text/plain; charset=utf-8", extension: "txt" },
  csv: { implemented: true, category: "data", mimeType: "text/csv; charset=utf-8", extension: "csv" },
  xlsx: {
    implemented: true,
    category: "spreadsheet",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  xls: { implemented: true, category: "spreadsheet", mimeType: "application/vnd.ms-excel", extension: "xls" },
  ods: { implemented: true, category: "spreadsheet", mimeType: "application/vnd.oasis.opendocument.spreadsheet", extension: "ods" },
  json: { implemented: true, category: "data", mimeType: "application/json; charset=utf-8", extension: "json" },
  xml: { implemented: true, category: "data", mimeType: "application/xml; charset=utf-8", extension: "xml" },
  html: { implemented: false, category: "document", mimeType: "text/html; charset=utf-8", extension: "html" },
  qif: { implemented: true, category: "financial", mimeType: "application/qif; charset=utf-8", extension: "qif" },
  ofx: { implemented: true, category: "financial", mimeType: "application/x-ofx; charset=utf-8", extension: "ofx" },
  mt940: { implemented: true, category: "financial", mimeType: "text/plain; charset=utf-8", extension: "sta" },
  camt053: { implemented: true, category: "financial", mimeType: "application/xml; charset=utf-8", extension: "xml" },
} as const

export type ExportFormatDefinition = (typeof EXPORT_FORMATS)[keyof typeof EXPORT_FORMATS]
export type ExportFormatCategory = ExportFormatDefinition["category"]

export const exportFormats = Object.keys(EXPORT_FORMATS) as Array<keyof typeof EXPORT_FORMATS>

export const fullyImplementedExportFormats = exportFormats.filter((format) => EXPORT_FORMATS[format].implemented)
export const experimentalExportFormats = [] as Array<keyof typeof EXPORT_FORMATS>
export const plannedExportFormats = exportFormats.filter((format) => !EXPORT_FORMATS[format].implemented)

export function getExportFormatDefinition(format: keyof typeof EXPORT_FORMATS) {
  return EXPORT_FORMATS[format]
}
