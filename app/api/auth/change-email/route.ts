// POST /api/auth/change-email - Request email change
import { prisma } from '@/lib/prisma'
import { requireRequestUser } from '@/lib/api-auth'
import { createHash, randomBytes } from 'crypto'
import { validateEmail } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit-simple'
import { ApiErrorCode } from '@/lib/api-errors'
import { apiError, apiSuccess } from '@/lib/api-response'

const VERIFICATION_TTL = 1000 * 60 * 60 * 24 // 24 hours

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function POST(request: Request) {
  try {
    const user = await requireRequestUser()
    if (!user) {
      return apiError(ApiErrorCode.UNAUTHORIZED, 'Authentication required', { status: 401 })
    }

    // Rate limit by user
    if (!checkRateLimit(`change-email:${user.id}`, 3)) {
      return apiError(ApiErrorCode.RATE_LIMITED, 'Too many attempts. Please try again later.', { status: 429 })
    }

    let body: { email?: string }
    try {
      body = await request.json()
    } catch {
      return apiError(ApiErrorCode.BAD_REQUEST, 'Invalid JSON body', { status: 400 })
    }

    const newEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!newEmail || !validateEmail(newEmail)) {
      return apiError(ApiErrorCode.VALIDATION_ERROR, 'Invalid email format', { status: 400 })
    }

    if (newEmail === user.email) {
      return apiError(ApiErrorCode.VALIDATION_ERROR, 'New email is the same as current', { status: 400 })
    }

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email: newEmail } })
    if (existing) {
      return apiError(ApiErrorCode.CONFLICT, 'Email is already in use', { status: 409 })
    }

    // Invalidate existing unused verifications
    await prisma.emailVerification.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    })

    // Create verification token
    const token = randomBytes(32).toString('base64url')
    const tokenHash = sha256Hex(token)

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: newEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + VERIFICATION_TTL),
      },
    })

    // In production, send email here
    // await sendVerificationEmail(newEmail, token)
  
    console.log(`[DEV] Email verification token for ${newEmail}: ${token}`)

    return apiSuccess({
      success: true,
      // Remove in production:
      devToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    }, { message: 'Verification email has been sent' })
  } catch (error: any) {
    return apiError(error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR, error?.status === 401 ? 'Authentication required' : 'Failed to request email change', { status: error?.status === 401 ? 401 : 500 })
  }
}
