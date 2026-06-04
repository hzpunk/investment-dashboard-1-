// POST /api/auth/forgot-password - Request password reset
import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'
import { validateEmail } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit-simple'
import { ApiErrorCode } from '@/lib/api-errors'
import { apiError, apiSuccess } from '@/lib/api-response'

const RESET_TOKEN_TTL = 1000 * 60 * 60 // 1 hour

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`forgot-password:${ip}`, 3)) {
    return apiError(ApiErrorCode.RATE_LIMITED, 'Too many attempts. Please try again later.', { status: 429 })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return apiError(ApiErrorCode.BAD_REQUEST, 'Invalid JSON body', { status: 400 })
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email || !validateEmail(email)) {
    return apiError(ApiErrorCode.VALIDATION_ERROR, 'Invalid email format', { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent user enumeration
  if (!user) {
    return apiSuccess({ success: true }, { message: 'If an account exists, a reset link has been sent.' })
  }

  // Invalidate existing unused tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  // Create new reset token
  const token = randomBytes(32).toString('base64url')
  const tokenHash = sha256Hex(token)

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL),
    },
  })

  // In production, send email here
  // await sendPasswordResetEmail(user.email, token)
  
  // For development, return the token
  console.log(`[DEV] Password reset token for ${email}: ${token}`)

  return apiSuccess({
    success: true,
    // Remove in production:
    devToken: process.env.NODE_ENV !== 'production' ? token : undefined,
  }, { message: 'If an account exists, a reset link has been sent.' })
}
