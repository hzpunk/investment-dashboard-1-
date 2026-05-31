import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-auth"

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

export async function GET() {
  try {
    await requireAdmin()
    const settings = await prisma.adminSetting.findMany({
      orderBy: { settingKey: "asc" },
    })

    return NextResponse.json({
      settings: settings.map(formatSetting),
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: error?.status ?? 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json().catch(() => null)
    const key = String(body?.key ?? "").trim()

    if (!key) {
      return NextResponse.json({ error: "Setting key is required" }, { status: 400 })
    }

    const setting = await prisma.adminSetting.upsert({
      where: { settingKey: key },
      update: {
        settingValue: String(body?.value ?? ""),
        description: body?.description ? String(body.description) : null,
        updatedAt: new Date(),
      },
      create: {
        settingKey: key,
        settingValue: String(body?.value ?? ""),
        description: body?.description ? String(body.description) : null,
      },
    })

    return NextResponse.json({ setting: formatSetting(setting) }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save setting" }, { status: error?.status ?? 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json().catch(() => null)
    const settings = Array.isArray(body?.settings) ? body.settings : []

    await prisma.$transaction(
      settings
        .filter((setting: any) => typeof setting?.key === "string")
        .map((setting: any) =>
          prisma.adminSetting.upsert({
            where: { settingKey: setting.key },
            update: {
              settingValue: String(setting.value ?? ""),
              description: setting.description ?? null,
              updatedAt: new Date(),
            },
            create: {
              settingKey: setting.key,
              settingValue: String(setting.value ?? ""),
              description: setting.description ?? null,
            },
          }),
        ),
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: error?.status ?? 500 })
  }
}
