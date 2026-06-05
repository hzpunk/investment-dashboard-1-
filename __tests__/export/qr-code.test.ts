import QRCode from "qrcode"
import { dataUrlToBytes, generateQrCodeAssets } from "@/lib/export/qr-code"

jest.mock("qrcode", () => ({
  toDataURL: jest.fn(),
  toString: jest.fn(),
}))

const mockedQr = QRCode as jest.Mocked<typeof QRCode>

describe("export QR code", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns QR assets", async () => {
    mockedQr.toDataURL.mockResolvedValue("data:image/png;base64,SGVsbG8=" as never)
    mockedQr.toString.mockResolvedValue("<svg />" as never)

    const result = await generateQrCodeAssets("https://example.com")

    expect(result.dataUrl).toContain("data:image/png")
    expect(result.svg).toBe("<svg />")
    expect(dataUrlToBytes(result.dataUrl)?.byteLength).toBeGreaterThan(0)
  })

  it("fails gracefully", async () => {
    mockedQr.toDataURL.mockRejectedValue(new Error("boom") as never)
    mockedQr.toString.mockResolvedValue("<svg />" as never)

    const result = await generateQrCodeAssets("https://example.com")

    expect(result.dataUrl).toBeNull()
    expect(result.svg).toBeNull()
    expect(result.error).toBe("boom")
  })
})
