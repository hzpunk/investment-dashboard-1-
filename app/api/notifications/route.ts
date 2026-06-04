import { prisma } from "@/lib/prisma"
import { requireRequestUser } from "@/lib/api-auth"
import { sanitizeString } from "@/lib/validation"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

// GET /api/notifications - get user notifications
export async function GET(request: Request) {
  try {
    const user = await requireRequestUser()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100)
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

    return apiSuccess({
      notifications,
      unreadCount,
    })
  } catch (error: any) {
    return apiError(error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR, error?.status === 401 ? "Authentication required" : "Failed to fetch notifications", { status: error?.status === 401 ? 401 : 500 })
  }
}

// POST /api/notifications - create notification (for testing/admin)
export async function POST(request: Request) {
  try {
    const user = await requireRequestUser()
    const body = await request.json()
    const { title, message, type, metadata } = body

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: sanitizeString(title || "Notification"),
        message: sanitizeString(message || ""),
        type: type || "info",
        metadata: metadata || {},
        read: false,
      },
    })

    return apiSuccess({ notification }, { message: "Notification created" })
  } catch (error: any) {
    return apiError(error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR, error?.status === 401 ? "Authentication required" : "Failed to create notification", { status: error?.status === 401 ? 401 : 500 })
  }
}

// PATCH /api/notifications - mark as read
export async function PATCH(request: Request) {
  try {
    const user = await requireRequestUser()
    const body = await request.json()
    const { id, all } = body

    if (all) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, readAt: new Date() },
      })
      return apiSuccess({ markedAsRead: "all" })
    }

    if (id) {
      await prisma.notification.update({
        where: { id, userId: user.id },
        data: { read: true, readAt: new Date() },
      })
      return apiSuccess({ markedAsRead: id })
    }

    return apiError(ApiErrorCode.VALIDATION_ERROR, "Must provide id or all=true", { status: 400 })
  } catch (error: any) {
    return apiError(error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR, error?.status === 401 ? "Authentication required" : "Failed to update notification", { status: error?.status === 401 ? 401 : 500 })
  }
}

// DELETE /api/notifications - delete notification
export async function DELETE(request: Request) {
  try {
    const user = await requireRequestUser()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (id) {
      await prisma.notification.delete({
        where: { id, userId: user.id },
      })
      return apiSuccess({ deleted: id })
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

    return apiSuccess({ deletedCount: result.count })
  } catch (error: any) {
    return apiError(error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR, error?.status === 401 ? "Authentication required" : "Failed to delete notification", { status: error?.status === 401 ? 401 : 500 })
  }
}
