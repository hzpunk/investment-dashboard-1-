import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-auth"
import { sanitizeString } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json().catch(() => null)

    const title = sanitizeString(body?.title || "")
    const message = sanitizeString(body?.message || "")
    const type = body?.type || "info"
    const sendToAll = body?.sendToAll !== false
    const selectedUsers = Array.isArray(body?.selectedUsers) ? body.selectedUsers.filter(Boolean) : []

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: sendToAll ? {} : { id: { in: selectedUsers } },
      select: { id: true },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 })
    }

    const result = await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        title,
        message,
        type,
        metadata: {},
        read: false,
      })),
    })

    return NextResponse.json({ success: true, sent: result.count })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: error?.status ?? 500 })
  }
}
