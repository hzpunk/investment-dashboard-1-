import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-response"
import { withAuth } from "@/lib/api-handler"
import { generateExportFile } from "@/lib/export/generators"
import { prepareExportBundle } from "@/lib/export/prepare-export"
import type { ExportRequest, ExportSections } from "@/lib/export/types"

export const POST = withAuth(async (request: NextRequest, user) => {
  let body: unknown = null
  try {
    body = await parseJson(request)
    const prepared = await prepareExportBundle(request, user, body)

    if (!prepared.ok) {
      return apiError(prepared.validation.code, prepared.validation.message, {
        status: exportStatusForCode(prepared.validation.code),
        details: prepared.validation.details,
      })
    }

    const file = await generateExportFile(prepared.bundle.metadata.format, prepared.bundle)
    return new NextResponse(toResponseBody(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code?: unknown }).code) : "EXPORT_GENERATION_FAILED"
    console.error("[Export] Generation failed", {
      format: readLogFormat(body),
      sections: readLogSections(body),
      error,
    })
    return apiError(code, publicExportErrorMessage(code), {
      status: exportStatusForCode(code),
      details: (error as { details?: unknown })?.details,
    })
  }
})

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const format = (searchParams.get("format") || "csv") as ExportRequest["format"]
    const type = searchParams.get("type") || "transactions"
    const sections: ExportSections =
      type === "portfolio"
        ? { portfolioSummary: true, accounts: true, holdings: true, assets: true, analytics: true, metadata: true }
        : type === "tax-report"
          ? { transactions: true, analytics: true, metadata: true }
          : { transactions: true, metadata: true }

    const body: ExportRequest = {
      format,
      sections,
      period: type === "tax-report" ? { type: "1y" } : { type: "all" },
      options: {
        title: type === "portfolio" ? "Portfolio export" : type === "tax-report" ? "Tax report export" : "Transactions export",
        includeCharts: false,
        includeQrCode: false,
        includeAppLink: false,
      },
    }

    const prepared = await prepareExportBundle(request, user, body)
    if (!prepared.ok) {
      return apiError(prepared.validation.code, prepared.validation.message, {
        status: exportStatusForCode(prepared.validation.code),
        details: prepared.validation.details,
      })
    }

    const file = await generateExportFile(prepared.bundle.metadata.format, prepared.bundle)
    return new NextResponse(toResponseBody(file.body), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code?: unknown }).code) : "EXPORT_GENERATION_FAILED"
    console.error("[Export] Generation failed", {
      format: new URL(request.url).searchParams.get("format") || "csv",
      sections: [],
      error,
    })
    return apiError(code, publicExportErrorMessage(code), {
      status: exportStatusForCode(code),
      details: (error as { details?: unknown })?.details,
    })
  }
})

async function parseJson(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function publicExportErrorMessage(code: string) {
  switch (code) {
    case "VALIDATION_ERROR":
      return "Invalid export request"
    case "EXPORT_NO_SECTIONS_SELECTED":
      return "No export sections selected"
    case "EXPORT_FORMAT_NOT_SUPPORTED":
      return "Export format is not supported"
    case "EXPORT_LAYOUT_FAILED":
      return "Export layout validation failed"
    case "EXPORT_LAYOUT_OVERLAP":
      return "Export layout has overlapping blocks"
    case "EXPORT_FORMAT_NOT_IMPLEMENTED":
      return "Export format is not implemented"
    case "EXPORT_FONT_FAILED":
      return "Failed to load document font"
    case "EXPORT_CHART_RENDER_FAILED":
      return "Export chart rendering failed"
    case "ACCOUNT_NOT_FOUND":
      return "Account not found"
    case "ACCOUNT_ACCESS_DENIED":
      return "Account access denied"
    default:
      return "Export generation failed"
  }
}

function exportStatusForCode(code: string) {
  switch (code) {
    case "VALIDATION_ERROR":
    case "EXPORT_NO_SECTIONS_SELECTED":
      return 400
    case "FORBIDDEN":
      return 403
    case "ACCOUNT_NOT_FOUND":
    case "ACCOUNT_ACCESS_DENIED":
      return code === "ACCOUNT_NOT_FOUND" ? 404 : 403
    case "EXPORT_FORMAT_NOT_SUPPORTED":
    case "EXPORT_FORMAT_NOT_IMPLEMENTED":
    case "EXPORT_NO_DATA":
    case "EXPORT_LAYOUT_OVERLAP":
    case "EXPORT_LAYOUT_FAILED":
    case "EXPORT_CHART_RENDER_FAILED":
      return 422
    default:
      return 500
  }
}

function readLogFormat(body: unknown) {
  return body && typeof body === "object" && "format" in body ? String((body as { format?: unknown }).format ?? "") : ""
}

function readLogSections(body: unknown) {
  if (!body || typeof body !== "object" || !("sections" in body)) return []
  const sections = (body as { sections?: unknown }).sections
  if (!sections || typeof sections !== "object") return []
  return Object.entries(sections as Record<string, unknown>)
    .filter(([, selected]) => selected === true)
    .map(([key]) => key)
}

function toResponseBody(body: string | Uint8Array): BodyInit {
  if (typeof body === "string") return body
  return Buffer.from(body) as unknown as BodyInit
}
