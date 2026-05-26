import { createLogger } from "@/lib/logger"

const logger = createLogger("AssetAPI")

export type Asset = {
  id: string
  symbol: string
  name: string
  type: "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"
  currentPrice: number
  currency: string
  updatedAt: string
}

export type AssetInsert = Omit<Asset, "id" | "updatedAt"> & { updatedAt?: string }

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options)
    const data = await res.json().catch(() => null)

    if (!res.ok) {
      logger.warn(`API request failed: ${url}`, data?.error)
      return null
    }

    return data as T
  } catch (error) {
    logger.error(`API request error: ${url}`, error)
    return null
  }
}

export async function fetchAssets() {
  const data = await apiFetch<{ assets: Asset[] }>("/api/data/assets")
  return data?.assets || []
}

export async function fetchAssetById(id: string): Promise<Asset | null> {
  const data = await apiFetch<{ asset: Asset }>(`/api/data/assets/${encodeURIComponent(id)}`)
  return data?.asset || null
}

export async function createAsset(asset: AssetInsert) {
  const data = await apiFetch<{ asset: Asset }>("/api/data/assets", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  })
  if (!data) throw new Error('Failed to create asset')
  return data.asset
}

export async function updateAsset(id: string, updates: Partial<Asset>) {
  const data = await apiFetch<{ asset: Asset }>(`/api/data/assets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!data) throw new Error('Failed to update asset')
  return data.asset
}

export async function deleteAsset(id: string) {
  const data = await apiFetch<{ success: boolean }>(`/api/data/assets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return data?.success || false
}

export async function updateAssetPrices() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3003';
    const res = await fetch(`${baseUrl}/api/cron/update-prices`, { method: 'POST' })
    return res.ok
  } catch (e) {
    logger.error('Failed to update prices:', e)
    return false
  }
}

