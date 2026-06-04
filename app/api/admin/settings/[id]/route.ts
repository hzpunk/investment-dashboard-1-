import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-auth"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

type RouteContext = {
  params: Promise<{ id: string }>
}

function formatSetting(setting: {
  id: string
  settingKey: string
  settingValue: string
  description: string | null
  updatedAt: Date
}) {
  return {
    id: setting.id,
    settingKey: setting.settingKey,
    settingValue: setting.settingValue,
    description: setting.description,
    updatedAt: setting.updatedAt.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params
    const body = await request.json().catch(() => null)

    const setting = await prisma.adminSetting.update({
      where: { id },
      data: {
        settingValue: String(body?.value ?? ""),
        description:
          body?.description === undefined
            ? undefined
            : body.description
              ? String(body.description)
              : null,
        updatedAt: new Date(),
      },
    })

    return apiSuccess({ setting: formatSetting(setting) })
  } catch (error: any) {
    const status = error?.code === "P2025" ? 404 : error?.status ?? 500
    return apiError(status === 404 ? ApiErrorCode.NOT_FOUND : ApiErrorCode.INTERNAL_ERROR, status === 404 ? "Setting not found" : "Failed to update setting", { status })
  }
}
