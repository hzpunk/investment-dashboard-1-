import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { createSession, getSessionCookieName } from '@/lib/auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, roles: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const { token, expiresAt } = await createSession(user.id, 1000 * 60 * 60 * 24 * 30)

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.profile?.username ?? user.email.split('@')[0] ?? 'User',
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
