import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-auth"

const roles = ["admin", "user", "premium"] as const
type Role = (typeof roles)[number]

function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role)
}

function formatUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.profile?.username ?? user.email.split("@")[0],
    role: user.roles?.[0]?.role ?? user.profile?.role ?? "user",
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastSignInAt: null,
  }
}

async function assertCanRemoveAdminRole(targetUserId: string, currentUserId: string, nextRole?: Role) {
  const currentRole = await prisma.userRoleAssignment.findFirst({
    where: { userId: targetUserId, role: "admin" },
  })

  if (!currentRole || nextRole === "admin") {
    return
  }

  if (targetUserId === currentUserId) {
    throw Object.assign(new Error("Cannot remove your own admin role"), { status: 400 })
  }

  const adminCount = await prisma.userRoleAssignment.count({ where: { role: "admin" } })
  if (adminCount <= 1) {
    throw Object.assign(new Error("Cannot remove the last admin account"), { status: 400 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAdmin()
    const { id } = await context.params
    const body = await request.json().catch(() => null)

    const username = typeof body?.username === "string" ? body.username.trim() : undefined
    const role = body?.role === undefined ? undefined : isRole(body.role) ? body.role : null

    if (username !== undefined && (username.length < 2 || username.length > 50)) {
      return NextResponse.json({ error: "Username must be 2-50 characters" }, { status: 400 })
    }
    if (role === null) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    await assertCanRemoveAdminRole(id, currentUser.id, role)

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { id },
        include: { profile: true, roles: true },
      })
      if (!existing) {
        throw Object.assign(new Error("User not found"), { status: 404 })
      }

      if (username !== undefined || role !== undefined) {
        await tx.profile.upsert({
          where: { id },
          update: {
            ...(username !== undefined ? { username } : {}),
            ...(role !== undefined ? { role } : {}),
          },
          create: {
            id,
            username: username ?? existing.email.split("@")[0],
            role: role ?? "user",
          },
        })
      }

      if (role !== undefined) {
        await tx.userRoleAssignment.deleteMany({ where: { userId: id } })
        await tx.userRoleAssignment.create({ data: { userId: id, role } })
      }

      return tx.user.findUniqueOrThrow({
        where: { id },
        include: {
          profile: true,
          roles: { orderBy: { assignedAt: "desc" } },
        },
      })
    })

    return NextResponse.json({ user: formatUser(user) })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update user" },
      { status: error?.status ?? 500 },
    )
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireAdmin()
    const { id } = await context.params

    if (id === currentUser.id) {
      return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 })
    }

    const targetIsAdmin = await prisma.userRoleAssignment.findFirst({
      where: { userId: id, role: "admin" },
    })
    if (targetIsAdmin) {
      const adminCount = await prisma.userRoleAssignment.count({ where: { role: "admin" } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last admin account" }, { status: 400 })
      }
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.code === "P2025" ? "User not found" : "Failed to delete user" },
      { status: error?.code === "P2025" ? 404 : error?.status ?? 500 },
    )
  }
}
