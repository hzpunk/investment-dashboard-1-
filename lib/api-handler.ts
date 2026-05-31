import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from './api-auth'

// User type from auth
export interface AuthenticatedUser {
  id: string
  email: string
}

// API Route context type
export type RouteContext = {
  params: Promise<Record<string, string | string[]>>
}

// Error response type
export type ErrorResponse = { error: string; code?: string }

// Enhanced API handler type - handler returns success response, wrapper handles errors
export type ApiHandler<T = unknown> = (
  req: NextRequest,
  user: AuthenticatedUser,
  ctx: RouteContext
) => Promise<NextResponse<T> | NextResponse<ErrorResponse>>

// Custom API error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Higher-order function to wrap API handlers with common error handling
 * Eliminates duplicate try-catch blocks in every route
 */
export function withAuth<T>(handler: ApiHandler<T>) {
  return async (
    req: NextRequest,
    ctx: RouteContext
  ): Promise<NextResponse> => {
    const startedAt = performance.now()
    let status = 500

    try {
      const user = await requireRequestUser()
      const response = await handler(req, user, ctx)
      status = response.status
      return response
    } catch (error) {
      const errorStatus = typeof (error as any)?.status === 'number' ? (error as any).status : undefined

      if (errorStatus === 401) {
        status = 401
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        )
      }

      if (errorStatus === 403) {
        status = 403
        return NextResponse.json(
          { error: 'Forbidden', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      // Handle 401 from requireRequestUser
      if (error instanceof ApiError && error.statusCode === 401) {
        status = 401
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        )
      }

      // Handle custom API errors
      if (error instanceof ApiError) {
        status = error.statusCode
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        )
      }

      // Log and return 500 for unexpected errors
      console.error('API Error:', error)
      status = 500
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    } finally {
      if (process.env.NODE_ENV !== 'production') {
        const durationMs = Math.round(performance.now() - startedAt)
        const pathname = new URL(req.url).pathname
        console.info(`[api] ${req.method} ${pathname} -> ${status} in ${durationMs}ms`)
      }
    }
  }
}

/**
 * Create standard error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string
): NextResponse<ErrorResponse> {
  const body: ErrorResponse = code ? { error: message, code } : { error: message }
  return NextResponse.json(body, { status })
}

/**
 * Create standard success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * Create paginated success response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): NextResponse<{
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasMore: boolean
  }
}> {
  return NextResponse.json({
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  })
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
 * Safely parse JSON body with validation
 */
export async function parseBody<T>(req: NextRequest): Promise<T | null> {
  try {
    const body = await req.json()
    return body as T
  } catch {
    return null
  }
}

/**
 * Parse search params from URL
 */
export function parseSearchParams(url: string): URLSearchParams {
  return new URL(url).searchParams
}

/**
 * Validate request body against required fields
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T | null,
  fields: (keyof T)[]
): { valid: true; data: T } | { valid: false; missing: string[] } {
  if (!data) {
    return { valid: false, missing: fields as string[] }
  }

  const missing = fields.filter((field) => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })

  if (missing.length > 0) {
    return { valid: false, missing: missing as string[] }
  }

  return { valid: true, data }
}
