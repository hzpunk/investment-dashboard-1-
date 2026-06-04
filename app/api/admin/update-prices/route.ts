import { updateAssetPricesService } from "@/lib/services/update-asset-prices"
import { requireAdmin } from "@/lib/api-auth"
import { ApiErrorCode } from "@/lib/api-errors"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function POST() {
  try {
    await requireAdmin()
    const result = await updateAssetPricesService()

    return apiSuccess({
      success: true,
      result,
    }, { message: "Asset price update completed" })
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL_ERROR, "Failed to update asset prices", { status: 500 })
  }
}
