jest.mock("server-only", () => ({}), { virtual: true })

jest.mock("next/server", () => {
  class MockNextResponse {
    status: number
    headers: Headers
    private payload: unknown

    constructor(body: unknown, init?: ResponseInit) {
      this.payload = body
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
    }

    static json(body: unknown, init?: ResponseInit) {
      return new MockNextResponse(body, init)
    }

    async json() {
      return this.payload
    }
  }

  return {
    NextRequest: class {},
    NextResponse: MockNextResponse,
  }
})

jest.mock("@/lib/api-auth", () => ({
  requireRequestUser: jest.fn(),
}))

jest.mock("@/lib/export/prepare-export", () => ({
  prepareExportBundle: jest.fn(),
}))

jest.mock("@/lib/export/generators", () => ({
  generateExportFile: jest.fn(),
}))

import { requireRequestUser } from "@/lib/api-auth"
import { generateExportFile } from "@/lib/export/generators"
import { prepareExportBundle } from "@/lib/export/prepare-export"
import { POST } from "@/app/api/export/route"

const mockedRequireRequestUser = requireRequestUser as jest.Mock
const mockedPrepareExportBundle = prepareExportBundle as jest.Mock
const mockedGenerateExportFile = generateExportFile as jest.Mock

describe("export API route", () => {
  let consoleInfoSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockedRequireRequestUser.mockResolvedValue({ id: "user-1", email: "user@example.com", role: "user" })
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleInfoSpy.mockRestore()
  })

  it("requires authentication", async () => {
    mockedRequireRequestUser.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }))

    const response = await POST(
      { method: "POST", url: "http://localhost/api/export", json: async () => ({ format: "json", sections: { accounts: true } }) } as never,
      { params: Promise.resolve({}) },
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  it("returns 400 unified error for invalid body", async () => {
    mockedPrepareExportBundle.mockResolvedValueOnce({
      ok: false,
      validation: { ok: false, code: "VALIDATION_ERROR", message: "Invalid export request", details: { body: "invalid" } },
    })

    const response = await POST(request({}), { params: Promise.resolve({}) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual(expect.objectContaining({ ok: false }))
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for no selected sections", async () => {
    mockedPrepareExportBundle.mockResolvedValueOnce({
      ok: false,
      validation: { ok: false, code: "EXPORT_NO_SECTIONS_SELECTED", message: "No export sections selected" },
    })

    const response = await POST(request({ format: "pdf", sections: {} }), { params: Promise.resolve({}) })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("EXPORT_NO_SECTIONS_SELECTED")
  })

  it("returns 422 for unsupported formats", async () => {
    mockedPrepareExportBundle.mockResolvedValueOnce({
      ok: false,
      validation: { ok: false, code: "EXPORT_FORMAT_NOT_SUPPORTED", message: "Export format is not supported" },
    })

    const response = await POST(request({ format: "bad", sections: { accounts: true } }), { params: Promise.resolve({}) })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe("EXPORT_FORMAT_NOT_SUPPORTED")
  })

  it("returns 422 for planned formats", async () => {
    mockedPrepareExportBundle.mockResolvedValueOnce({
      ok: false,
      validation: { ok: false, code: "EXPORT_FORMAT_NOT_IMPLEMENTED", message: "Export format is not implemented" },
    })

    const response = await POST(request({ format: "html", sections: { transactions: true } }), { params: Promise.resolve({}) })
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error.code).toBe("EXPORT_FORMAT_NOT_IMPLEMENTED")
  })

  it("returns PDF binary response", async () => {
    mockedPrepareExportBundle.mockResolvedValueOnce(preparedBundle("pdf"))
    mockedGenerateExportFile.mockResolvedValueOnce({
      filename: "investment-report.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([1, 2, 3]),
    })

    const response = await POST(request({ format: "pdf", sections: { accounts: true } }), { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="investment-report.pdf"')
  })

  it("returns CSV binary response", async () => {
    mockedPrepareExportBundle.mockResolvedValueOnce(preparedBundle("csv"))
    mockedGenerateExportFile.mockResolvedValueOnce({
      filename: "investment-report.csv",
      contentType: "text/csv; charset=utf-8",
      body: "name\nBrokerage",
    })

    const response = await POST(request({ format: "csv", sections: { accounts: true } }), { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
  })
})

function request(body: unknown) {
  return { method: "POST", url: "http://localhost/api/export", json: async () => body } as never
}

function preparedBundle(format: string) {
  return {
    ok: true,
    warnings: [],
    bundle: {
      metadata: { format },
    },
  }
}
