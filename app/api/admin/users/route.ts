import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/api-auth"
import { hashPassword } from "@/lib/password"

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

export async function GET() {
  try {
    await requireAdmin()

    const users = await prisma.user.findMany({
      include: {
        profile: true,
        roles: { orderBy: { assignedAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ users: users.map(formatUser) })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.status === 403 ? "Forbidden" : "Failed to fetch users" },
      { status: error?.status ?? 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json().catch(() => null)

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    const username = typeof body?.username === "string" ? body.username.trim() : ""
    const role = isRole(body?.role) ? body.role : "user"

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }
    if (username.length < 2 || username.length > 50) {
      return NextResponse.json({ error: "Username must be 2-50 characters" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: true,
        profile: {
          create: {
            username,
            role,
          },
        },
        roles: {
          create: {
            role,
          },
        },
      },
      include: {
        profile: true,
        roles: true,
      },
    })

    return NextResponse.json({ user: formatUser(user) }, { status: 201 })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to create user" }, { status: error?.status ?? 500 })
  }
}
