import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from './api-auth'

export type ApiHandler = (req: NextRequest, user: { id: string; email: string }, ctx?: any) => Promise<NextResponse>

/**
 * Higher-order function to wrap API handlers with common error handling
 * Eliminates duplicate try-catch blocks in every route
 */
export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest, ctx?: any): Promise<NextResponse> => {
    try {
      const user = await requireRequestUser()
      return await handler(req, user, ctx)
    } catch (error: any) {
      // Handle 401 from requireRequestUser
      if (error?.status === 401) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Log and return 500 for unexpected errors
      console.error('API Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Create standard error response
 */
export function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Create standard success response
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Parse and validate limit/offset from query params
 */
export function parsePagination(searchParams: URLSearchParams) {
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 1000)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
  return { limit, offset }
}

/**
 * Safely parse JSON body
 */
export async function parseBody<T = any>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
