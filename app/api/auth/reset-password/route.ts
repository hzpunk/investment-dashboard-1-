// POST /api/auth/reset-password - Reset password with token
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { createHash } from 'crypto'
import { LIMITS, validateLength } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit-simple'

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`reset-password:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }

  let body: { token?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!token) {
    return NextResponse.json({ error: 'Reset token is required' }, { status: 400 })
  }

  if (!validateLength(password, LIMITS.PASSWORD_MAX, LIMITS.PASSWORD_MIN)) {
    return NextResponse.json(
      { error: `Password must be ${LIMITS.PASSWORD_MIN}-${LIMITS.PASSWORD_MAX} characters` },
      { status: 400 }
    )
  }

  const tokenHash = sha256Hex(token)

  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      tokenHash,
      used: false,
      expiresAt: { gt: new Date() },
    },
  })

  if (!resetRecord) {
    return NextResponse.json(
      { error: 'Invalid or expired reset token' },
      { status: 400 }
    )
  }

  // Hash new password
  const passwordHash = await hashPassword(password)

  // Update user password and invalidate all sessions
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
    // Invalidate all existing sessions for security
    prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    }),
  ])

  return NextResponse.json({
    success: true,
    message: 'Password has been reset successfully. Please sign in with your new password.',
  })
}
