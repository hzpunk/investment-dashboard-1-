import type { ExportDataBundle, ExportFile, ExportFormat } from "@/lib/export/types"
import { generateCamt053Export } from "@/lib/export/generators/camt053"
import { generateDocxExport } from "@/lib/export/generators/docx"
import { generateMt940Export } from "@/lib/export/generators/mt940"
import { generateOfxExport } from "@/lib/export/generators/ofx"
import { generatePdfExport } from "@/lib/export/generators/pdf"
import { generateQifExport } from "@/lib/export/generators/qif"
import {
  generateCsvExport,
  generateJsonExport,
  generateTxtExport,
  generateXmlExport,
  generateWorkbookExport,
} from "@/lib/export/generators/tabular"

export async function generateExportFile(format: ExportFormat, bundle: ExportDataBundle): Promise<ExportFile> {
  switch (format) {
    case "pdf":
      return generatePdfExport(bundle)
    case "docx":
      return generateDocxExport(bundle)
    case "csv":
      return generateCsvExport(bundle)
    case "xlsx":
    case "xls":
    case "ods":
      return generateWorkbookExport(bundle, format)
    case "txt":
      return generateTxtExport(bundle)
    case "json":
      return generateJsonExport(bundle)
    case "xml":
      return generateXmlExport(bundle)
    case "qif":
      return generateQifExport(bundle)
    case "ofx":
      return generateOfxExport(bundle)
    case "mt940":
      return generateMt940Export(bundle)
    case "camt053":
      return generateCamt053Export(bundle)
    case "html":
      throw exportError("EXPORT_FORMAT_NOT_IMPLEMENTED", `${format} export is not implemented.`)
    default:
      throw exportError("EXPORT_FORMAT_NOT_SUPPORTED", "Export format is not supported.")
  }
}

export function exportError(code: string, message: string, details?: unknown) {
  const error = new Error(message)
  ;(error as Error & { code?: string; details?: unknown }).code = code
  ;(error as Error & { code?: string; details?: unknown }).details = details
  return error
}
