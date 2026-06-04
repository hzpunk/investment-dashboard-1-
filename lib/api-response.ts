import { NextResponse } from "next/server"
import { ApiErrorCode, getDefaultErrorCode, type ApiErrorCodeValue } from "@/lib/api-errors"

export type ApiSuccess<T> = {
  ok: true
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export type ApiErrorBody = {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
    requestId?: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

type SuccessOptions = {
  message?: string
  meta?: Record<string, unknown>
  status?: number
}

type ErrorOptions = {
  status?: number
  details?: unknown
  requestId?: string
}

export function apiSuccess<T>(data: T, options: SuccessOptions = {}): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> = {
    ok: true,
    data,
    ...(options.message ? { message: options.message } : {}),
    ...(options.meta ? { meta: options.meta } : {}),
  }

  return NextResponse.json(body, { status: options.status ?? 200 })
}

export function apiError(
  code: string | ApiErrorCodeValue,
  message: string,
  options: ErrorOptions = {},
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    ok: false,
    error: {
      code,
      message,
      ...(options.details !== undefined ? { details: options.details } : {}),
      ...(options.requestId ? { requestId: options.requestId } : {}),
    },
  }

  return NextResponse.json(body, { status: options.status ?? 500 })
}

export function apiErrorFromStatus(message: string, status = 500, details?: unknown) {
  return apiError(getDefaultErrorCode(status), message, { status, details })
}

export function internalServerError() {
  return apiError(ApiErrorCode.INTERNAL_ERROR, "Internal server error", { status: 500 })
}
