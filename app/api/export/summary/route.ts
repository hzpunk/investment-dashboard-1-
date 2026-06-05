import { NextRequest } from "next/server"
import { apiError, apiSuccess } from "@/lib/api-response"
import { withAuth } from "@/lib/api-handler"
import { buildExportSummary } from "@/lib/export/formatters"
import { prepareExportBundle } from "@/lib/export/prepare-export"

export const POST = withAuth(async (request: NextRequest, user) => {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  try {
    const prepared = await prepareExportBundle(request, user, body, { includeQrAssets: false })
    if (!prepared.ok) {
      return apiError(prepared.validation.code, prepared.validation.message, {
        status: statusForCode(prepared.validation.code),
        details: prepared.validation.details,
      })
    }

    return apiSuccess({ summary: buildExportSummary(prepared.bundle) }, { meta: { warnings: prepared.bundle.metadata.warnings } })
  } catch (error) {
    console.error("[Export] Failed:", error)
    return apiError("EXPORT_GENERATION_FAILED", "Export generation failed", { status: 500 })
  }
})

function statusForCode(code: string) {
  if (code === "EXPORT_NO_SECTIONS_SELECTED" || code === "VALIDATION_ERROR") return 400
  if (code === "FORBIDDEN") return 403
  if (code === "EXPORT_FORMAT_NOT_SUPPORTED" || code === "EXPORT_FORMAT_NOT_IMPLEMENTED") return 422
  return 500
}
