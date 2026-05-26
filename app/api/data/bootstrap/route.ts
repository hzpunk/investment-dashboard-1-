import { NextResponse } from 'next/server'
import { withAuth, successResponse } from '@/lib/api-handler'

export const POST = withAuth(async () => {
  return successResponse({ ok: true })
})
