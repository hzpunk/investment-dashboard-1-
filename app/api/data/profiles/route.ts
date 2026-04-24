import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'

// GET /api/data/profiles - Get current user profile
export const GET = withAuth(async (request, user) => {
  // Get profile by user relation
  const profile = await prisma.profile.findFirst({
    where: { user: { id: user.id } },
  })

  if (!profile) {
    return errorResponse('Profile not found', 404)
  }

  return successResponse(profile)
})

// PUT /api/data/profiles - Update current user profile
export const PUT = withAuth(async (request, user) => {
  let data: { username?: string; avatar_url?: string }
  
  try {
    data = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  // Validate and sanitize inputs
  if (data.username) {
    if (data.username.length < 2 || data.username.length > 50) {
      return errorResponse('Username must be 2-50 characters', 400)
    }
  }

  // Find profile by user, then update by id
  const existing = await prisma.profile.findFirst({
    where: { user: { id: user.id } },
    select: { id: true }
  })
  
  if (!existing) {
    return errorResponse('Profile not found', 404)
  }

  const profile = await prisma.profile.update({
    where: { id: existing.id },
    data: {
      username: data.username,
      avatarUrl: data.avatar_url,
    },
  })

  return successResponse(profile)
})
