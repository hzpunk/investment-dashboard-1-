jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import { ApiErrorCode, getDefaultErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

describe("api response helpers", () => {
  it("returns a unified success response with data, message, meta and status", async () => {
    const response = apiSuccess(
      { id: "asset-1" },
      {
        message: "Asset loaded",
        meta: { source: "test" },
        status: 201,
      },
    )

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { id: "asset-1" },
      message: "Asset loaded",
      meta: { source: "test" },
    })
    expect(response.status).toBe(201)
  })

  it("returns a unified error response with code, details, request id and status", async () => {
    const response = apiError(ApiErrorCode.VALIDATION_ERROR, "Validation failed", {
      status: 400,
      details: { field: "message", reason: "empty" },
      requestId: "req-1",
    })

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { field: "message", reason: "empty" },
        requestId: "req-1",
      },
    })
    expect(response.status).toBe(400)
  })

  it("maps common HTTP statuses to stable error codes", () => {
    expect(getDefaultErrorCode(400)).toBe(ApiErrorCode.BAD_REQUEST)
    expect(getDefaultErrorCode(401)).toBe(ApiErrorCode.UNAUTHORIZED)
    expect(getDefaultErrorCode(403)).toBe(ApiErrorCode.FORBIDDEN)
    expect(getDefaultErrorCode(404)).toBe(ApiErrorCode.NOT_FOUND)
    expect(getDefaultErrorCode(409)).toBe(ApiErrorCode.CONFLICT)
    expect(getDefaultErrorCode(422)).toBe(ApiErrorCode.VALIDATION_ERROR)
    expect(getDefaultErrorCode(429)).toBe(ApiErrorCode.RATE_LIMITED)
    expect(getDefaultErrorCode(500)).toBe(ApiErrorCode.INTERNAL_ERROR)
  })
})
