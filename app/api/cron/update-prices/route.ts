import { NextResponse } from "next/server"
import { updateAssetPrices } from "@/entities/asset/api"

// This endpoint can be called by a cron job service like Vercel Cron
export async function GET() {
  try {
    await updateAssetPrices()
    return NextResponse.json({ success: true, message: "Asset prices updated successfully" })
  } catch (error) {
    console.error("Error updating asset prices:", error)
    return NextResponse.json({ error: "Failed to update asset prices" }, { status: 500 })
  }
}

