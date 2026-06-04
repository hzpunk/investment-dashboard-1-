import { NextRequest } from 'next/server'
import { requireRequestUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { ApiErrorCode } from '@/lib/api-errors'
import { apiError, apiSuccess } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser()
    if (!user) {
      return apiError(ApiErrorCode.UNAUTHORIZED, 'Authentication required', { status: 401 })
    }

    const { password } = await request.json()
    
    if (!password || password.length < 6) {
      return apiError(ApiErrorCode.VALIDATION_ERROR, 'Password must be at least 6 characters', { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return apiSuccess({ success: true }, { message: 'Password updated' })
  } catch (error: any) {
    return apiError(error?.status === 401 ? ApiErrorCode.UNAUTHORIZED : ApiErrorCode.INTERNAL_ERROR, error?.status === 401 ? 'Authentication required' : 'Failed to update password', { status: error?.status === 401 ? 401 : 500 })
  }
}
