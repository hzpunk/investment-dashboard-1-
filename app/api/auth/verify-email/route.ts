// POST /api/auth/verify-email - Verify email change
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit-simple'
import { deleteSessionByToken, getSessionCookieName } from '@/lib/auth'
import { cookies } from 'next/headers'

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`verify-email:${ip}`, 10)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = typeof body?.token === 'string' ? body.token : ''

  if (!token) {
    return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
  }

  const tokenHash = sha256Hex(token)

  const verification = await prisma.emailVerification.findFirst({
    where: {
      tokenHash,
      used: false,
      expiresAt: { gt: new Date() },
    },
  })

  if (!verification) {
    return NextResponse.json(
      { error: 'Invalid or expired verification token' },
      { status: 400 }
    )
  }

  // Update user email
  await prisma.$transaction([
    prisma.user.update({
      where: { id: verification.userId },
      data: { email: verification.email, emailVerified: true },
    }),
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    }),
  ])

  // Log out user from all sessions (except current if possible)
  const cookieStore = await cookies()
  const currentToken = cookieStore.get(getSessionCookieName())?.value
  if (currentToken) {
    await deleteSessionByToken(currentToken)
    cookieStore.delete(getSessionCookieName())
  }

  return NextResponse.json({
    success: true,
    message: 'Email has been verified and updated successfully. Please sign in again.',
  })
}
