import { createLogger } from "@/lib/logger"
import { type Asset } from "@/entities/asset/api"

const logger = createLogger("PortfolioAPI")

export type Portfolio = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: string
  assets?: PortfolioAsset[]
}

export type PortfolioInsert = Omit<Portfolio, "id" | "createdAt" | "userId"> & { createdAt?: string }

export type PortfolioAsset = {
  portfolioId: string
  assetId: string
  quantity: number
  averageBuyPrice: number
  asset: Asset
}

export type PortfolioAssetInsert = Omit<PortfolioAsset, "portfolioId" | "asset">

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

export async function fetchPortfolios() {
  const data = await apiFetch<{ portfolios: Portfolio[] }>("/api/data/portfolios")
  return data?.portfolios || []
}

export async function fetchPortfolioWithAssets(portfolioId: string) {
  const data = await apiFetch<{ portfolio: Portfolio }>(`/api/data/portfolios/${encodeURIComponent(portfolioId)}`)
  return data?.portfolio || null
}

export async function createPortfolio(portfolio: PortfolioInsert) {
  const data = await apiFetch<{ portfolio: Portfolio }>("/api/data/portfolios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(portfolio),
  })
  return data?.portfolio || null
}

export async function updatePortfolio(id: string, updates: Partial<Portfolio>) {
  const data = await apiFetch<{ portfolio: Portfolio }>(`/api/data/portfolios/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  return data?.portfolio || null
}

export async function deletePortfolio(id: string) {
  const data = await apiFetch<{ success: boolean }>(`/api/data/portfolios/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  return data?.success || false
}

export async function addAssetToPortfolio(portfolioId: string, asset: PortfolioAssetInsert) {
  const data = await apiFetch<{ portfolioAsset: PortfolioAsset }>(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(asset),
  })
  return data?.portfolioAsset || null
}

export async function updatePortfolioAsset(portfolioId: string, assetId: string, updates: Partial<PortfolioAsset>) {
  const data = await apiFetch<{ portfolioAsset: PortfolioAsset }>(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/assets`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId, ...updates }),
  })
  return data?.portfolioAsset || null
}

export async function removeAssetFromPortfolio(portfolioId: string, assetId: string) {
  const data = await apiFetch<{ success: boolean }>(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/assets?assetId=${encodeURIComponent(assetId)}`, {
    method: "DELETE",
  })
  return data?.success || false
}

export async function calculatePortfolioStats(portfolioId: string) {
  const data = await apiFetch<{ totalValue: number; assetCount: number; allocation: unknown[] }>(
    `/api/data/portfolios/${encodeURIComponent(portfolioId)}/stats`
  )
  return {
    totalValue: data?.totalValue ?? 0,
    assetCount: data?.assetCount ?? 0,
    allocation: data?.allocation ?? [],
  }
}

