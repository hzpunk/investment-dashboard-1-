import { getPublicAppUrl } from "@/lib/export/app-link"

describe("export app link", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.APP_PUBLIC_URL
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("uses APP_PUBLIC_URL first", () => {
    process.env.APP_PUBLIC_URL = "https://demo.example.com/"
    process.env.NEXT_PUBLIC_APP_URL = "https://public.example.com"

    expect(getPublicAppUrl()).toBe("https://demo.example.com")
  })

  it("infers URL from forwarded headers", () => {
    const headers = new Headers({
      "x-forwarded-proto": "https",
      "x-forwarded-host": "invest.example.com",
    })

    expect(getPublicAppUrl({ headers })).toBe("https://invest.example.com")
  })

  it("falls back to localhost", () => {
    expect(getPublicAppUrl()).toBe("http://localhost:3000")
  })
})
