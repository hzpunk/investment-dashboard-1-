import { NextResponse } from "next/server"
import { updateAssetPricesService } from "@/lib/services/update-asset-prices"
import { requireAdmin } from "@/lib/api-auth"

export async function POST() {
  try {
    await requireAdmin()
    const result = await updateAssetPricesService()

    return NextResponse.json({
      success: true,
      message: "Asset price update completed",
      result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update asset prices",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
