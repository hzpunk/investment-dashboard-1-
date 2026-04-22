import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

// GET /api/data/profiles?id=xxx - Get profile
export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return errorResponse('ID required', 400)
  }

  const profile = await prisma.profile.findUnique({
    where: { id },
  })

  if (!profile) {
    return errorResponse('Profile not found', 404)
  }

  return successResponse(profile)
})

// PUT /api/data/profiles?id=xxx - Update profile
export const PUT = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id || id !== user.id) {
    return errorResponse('Unauthorized', 401)
  }

  const data = await request.json()

  const profile = await prisma.profile.update({
    where: { id },
    data: {
      username: data.username,
      avatarUrl: data.avatar_url,
      updatedAt: new Date(),
    },
  })

  return successResponse(profile)
})
