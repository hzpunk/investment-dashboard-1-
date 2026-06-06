import "server-only"

import type { NextRequest } from "next/server"
import { collectExportData } from "@/lib/export/collect-export-data"
import { getPublicAppUrl } from "@/lib/export/app-link"
import { normalizeExportRequest } from "@/lib/export/formatters"
import { generateQrCodeAssets } from "@/lib/export/qr-code"
import { resolveAccountScopeForUser } from "@/lib/accounts/account-scope.server"
import type { AuthenticatedUser } from "@/lib/api-handler"
import type { ExportDataBundle, ExportValidationResult } from "@/lib/export/types"

export type PreparedExport =
  | { ok: true; bundle: ExportDataBundle; warnings: string[] }
  | { ok: false; validation: Extract<ExportValidationResult, { ok: false }> }

type PrepareExportOptions = {
  includeQrAssets?: boolean
}

export async function prepareExportBundle(
  request: NextRequest,
  user: AuthenticatedUser,
  body: unknown,
  options: PrepareExportOptions = {},
): Promise<PreparedExport> {
  const validation = normalizeExportRequest(body)
  if (!validation.ok) return { ok: false, validation }

  if (validation.request.sections.auditLogSummary && user.role !== "admin") {
    return {
      ok: false,
      validation: {
        ok: false,
        code: "FORBIDDEN",
        message: "Forbidden",
        details: { section: "auditLogSummary" },
      },
    }
  }

  const appUrl = getPublicAppUrl(request)
  const resolvedAccountScope = await resolveAccountScopeForUser(
    user.id,
    validation.request.accountScope.type === "single" ? validation.request.accountScope.accountId : "all",
  )
  const warnings = [...validation.warnings]
  let qr: Awaited<ReturnType<typeof generateQrCodeAssets>> = { dataUrl: null, svg: null }

  if (validation.request.options.includeQrCode && options.includeQrAssets !== false) {
    try {
      qr = await generateQrCodeAssets(appUrl)
      if ("error" in qr && qr.error) warnings.push("EXPORT_QR_FAILED")
    } catch (error) {
      console.error("[Export] QR generation failed:", error)
      warnings.push("EXPORT_QR_FAILED")
      qr = { dataUrl: null, svg: null }
    }
  }

  const bundle = await collectExportData({
    userId: user.id,
    user,
    request: validation.request,
    accountScope: resolvedAccountScope,
    appUrl,
    qrCodeDataUrl: qr.dataUrl,
    qrCodeSvg: qr.svg,
    initialWarnings: warnings,
  })

  return { ok: true, bundle, warnings }
}
