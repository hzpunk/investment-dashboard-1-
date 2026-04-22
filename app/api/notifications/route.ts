import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"

// GET /api/notifications - get user notifications
export async function GET(request: Request) {
  const user = await requireRequestUser()
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unread") === "true"
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100)

  try {
    const where: any = { userId: user.id }
    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Notifications fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

// POST /api/notifications - create notification (for testing/admin)
export async function POST(request: Request) {
  const user = await requireRequestUser()
  
  try {
    const body = await request.json()
    const { title, message, type, metadata } = body

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: title || "Notification",
        message: message || "",
        type: type || "info",
        metadata: metadata || {},
        read: false,
      },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    console.error("Notification create error:", error)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - mark as read
export async function PATCH(request: Request) {
  const user = await requireRequestUser()
  
  try {
    const body = await request.json()
    const { id, all } = body

    if (all) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, readAt: new Date() },
      })
      return NextResponse.json({ markedAsRead: "all" })
    }

    if (id) {
      await prisma.notification.update({
        where: { id, userId: user.id },
        data: { read: true, readAt: new Date() },
      })
      return NextResponse.json({ markedAsRead: id })
    }

    return NextResponse.json(
      { error: "Must provide id or all=true" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Notification update error:", error)
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - delete notification
export async function DELETE(request: Request) {
  const user = await requireRequestUser()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  try {
    if (id) {
      await prisma.notification.delete({
        where: { id, userId: user.id },
      })
      return NextResponse.json({ deleted: id })
    }

    // Delete all read notifications older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        read: true,
        readAt: { lt: thirtyDaysAgo },
      },
    })

    return NextResponse.json({ deletedCount: result.count })
  } catch (error) {
    console.error("Notification delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
