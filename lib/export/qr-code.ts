import QRCode from "qrcode"

export type QrCodeAssets = {
  dataUrl: string | null
  svg: string | null
  error?: string
}

export async function generateQrCodeAssets(value: string): Promise<QrCodeAssets> {
  try {
    const [dataUrl, svg] = await Promise.all([
      QRCode.toDataURL(value, { margin: 1, width: 160, errorCorrectionLevel: "M" }),
      QRCode.toString(value, { type: "svg", margin: 1, width: 160, errorCorrectionLevel: "M" }),
    ])
    return { dataUrl, svg }
  } catch (error) {
    return {
      dataUrl: null,
      svg: null,
      error: error instanceof Error ? error.message : "QR generation failed",
    }
  }
}

export function dataUrlToBytes(dataUrl: string | null | undefined): Uint8Array | null {
  if (!dataUrl) return null
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return Uint8Array.from(Buffer.from(match[2], "base64"))
}
