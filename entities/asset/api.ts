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

export type AssetInsert = {
  symbol: string
  name: string
  type: Asset["type"]
  currentPrice: number
  currency: string
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    logger.warn(`API request failed: ${url}`, data?.error)
    const error = new Error(data?.error || "Asset request failed") as Error & { code?: string }
    error.code = data?.code
    throw error
  }

  return data as T
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
  if (!data?.success) throw new Error('Failed to delete asset')
  return data.success
}

export async function triggerAssetPricesUpdate() {
  try {
    const data = await apiFetch<{ success: boolean; result?: unknown }>("/api/admin/update-prices", {
      method: "POST",
    })
    return data?.success === true
  } catch (e) {
    logger.error('Failed to update prices:', e)
    return false
  }
}

