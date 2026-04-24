import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { createSession, getSessionCookieName } from '@/lib/auth'
import { LIMITS, validateLength, validateEmail, validateUsername, sanitizeString } from '@/lib/validation'

export async function POST(request: Request) {
  // Safe JSON parsing with size limit
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const username = typeof body?.username === 'string' ? body.username.trim() : ''

  // Validate required fields
  if (!email || !password || !username) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Validate email format and length
  if (!validateEmail(email)) {
    return NextResponse.json({ error: 'Invalid email format or too long' }, { status: 400 })
  }

  // Validate username format (alphanumeric + safe chars)
  if (!validateUsername(username)) {
    return NextResponse.json({ 
      error: 'Username must be 2-50 chars, alphanumeric only' 
    }, { status: 400 })
  }

  // Validate password length
  if (!validateLength(password, LIMITS.PASSWORD_MAX, LIMITS.PASSWORD_MIN)) {
    return NextResponse.json({ 
      error: `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters` 
    }, { status: 400 })
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
          username: sanitizeString(username),
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
