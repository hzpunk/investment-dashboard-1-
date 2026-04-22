import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { createSession, getSessionCookieName } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const username = typeof body?.username === 'string' ? body.username.trim() : ''

  if (!email || !password || !username) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password too short' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      profile: {
        create: {
          username,
        },
      },
      roles: {
        create: {
          role: 'user',
        },
      },
    },
    include: { profile: true, roles: true },
  })

  const { token, expiresAt } = await createSession(user.id, 1000 * 60 * 60 * 24 * 30)

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.profile?.username ?? username,
      role: user.roles[0]?.role ?? 'user',
    },
  })

  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  return res
}
