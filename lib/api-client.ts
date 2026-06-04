import type { ApiResponse } from "@/lib/api-response"

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiClientError"
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !payload?.ok) {
    const code = payload?.ok === false ? payload.error.code : "UNKNOWN_ERROR"
    const message = payload?.ok === false ? payload.error.message : "Request failed"
    const details = payload?.ok === false ? payload.error.details : undefined
    throw new ApiClientError(message, code, response.status, details)
  }

  return payload.data
}

export function getApiErrorCode(error: unknown) {
  return isApiClientError(error) ? error.code : "UNKNOWN_ERROR"
}

export function getLocalizedApiError(t: (key: string) => string, error: unknown) {
  const code = getApiErrorCode(error)
  return getLocalizedApiErrorCode(t, code)
}

export function getLocalizedApiErrorCode(t: (key: string) => string, code: string | undefined | null) {
  const safeCode = code || "UNKNOWN_ERROR"
  const key = `api.errors.${safeCode}`
  const translated = t(key)
  return translated === key ? t("api.errors.UNKNOWN_ERROR") : translated
}
