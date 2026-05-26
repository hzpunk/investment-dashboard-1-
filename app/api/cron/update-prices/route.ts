import { NextResponse } from "next/server"
import { updateAssetPrices } from "@/entities/asset/api"

// This endpoint can be called by a cron job service like Vercel Cron
export async function POST() {
  console.log("[/api/cron/update-prices] POST endpoint hit");
  try {
    await updateAssetPrices()
    return NextResponse.json(
      { success: true, message: "Asset prices updated successfully" },
      {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3002',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update asset prices" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3003',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}

export async function OPTIONS(request: Request) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3003',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    }
  );
}

