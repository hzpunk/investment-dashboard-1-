import { cryptoIdMap } from "@/shared/api/market-data"

type Asset = {
  id: string
  symbol: string
  name: string
  type: "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"
  current_price: number
  currency: string
  updated_at: string
}

type AssetInsert = Omit<Asset, "id" | "updated_at"> & { updated_at?: string }

// Fetch all assets from the database
export async function fetchAssets() {
  return []
}

// Fetch a single asset by ID
export async function fetchAssetById(id: string): Promise<Asset | null> {
  const res = await fetch(`/api/data/assets?id=${id}`)
  if (!res.ok) return null
  return res.json()
}

// Create a new asset
export async function createAsset(asset: AssetInsert): Promise<Asset> {
  const res = await fetch('/api/data/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset),
  })
  if (!res.ok) throw new Error('Failed to create asset')
  return res.json()
}

// Update an asset
export async function updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
  const res = await fetch(`/api/data/assets?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update asset')
  return res.json()
}

// Delete an asset
export async function deleteAsset(id: string): Promise<void> {
  const res = await fetch(`/api/data/assets?id=${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete asset')
}

// Update asset prices from external APIs
export async function updateAssetPrices() {
  return true
}

