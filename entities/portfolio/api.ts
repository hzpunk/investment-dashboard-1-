type Portfolio = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: string
}

type PortfolioInsert = Omit<Portfolio, "id" | "createdAt"> & { createdAt?: string }
type PortfolioAsset = {
  portfolioId: string
  assetId: string
  quantity: number
  averageBuyPrice: number
}
type PortfolioAssetInsert = PortfolioAsset

// Fetch all portfolios for a user
export async function fetchPortfolios(userId: string) {
  void userId
  try {
    const res = await fetch("/api/data/portfolios", { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchPortfolios failed:", data?.error)
      return []
    }
    return (data?.portfolios as Portfolio[]) || []
  } catch (e) {
    console.warn("fetchPortfolios error:", e)
    return []
  }
}

// Fetch a single portfolio with its assets
export async function fetchPortfolioWithAssets(portfolioId: string) {
  console.warn(`Not implemented: fetchPortfolioWithAssets(${portfolioId})`)
  return null
}

// Create a new portfolio
export async function createPortfolio(portfolio: PortfolioInsert) {
  console.warn(`Not implemented: createPortfolio(${portfolio.name})`)
  return null
}

// Update a portfolio
export async function updatePortfolio(id: string, updates: Partial<Portfolio>) {
  console.warn(`Not implemented: updatePortfolio(${id})`)
  return null
}

// Delete a portfolio
export async function deletePortfolio(id: string) {
  console.warn(`Not implemented: deletePortfolio(${id})`)
  return null
}

// Add an asset to a portfolio
export async function addAssetToPortfolio(portfolioAsset: PortfolioAssetInsert) {
  console.warn(`Not implemented: addAssetToPortfolio(${portfolioAsset.portfolioId})`)
  return null
}

// Update a portfolio asset
export async function updatePortfolioAsset(portfolioId: string, assetId: string, updates: Partial<PortfolioAsset>) {
  console.warn(`Not implemented: updatePortfolioAsset(${portfolioId}, ${assetId})`)
  return null
}

// Remove an asset from a portfolio
export async function removeAssetFromPortfolio(portfolioId: string, assetId: string) {
  console.warn(`Not implemented: removeAssetFromPortfolio(${portfolioId}, ${assetId})`)
  return null
}

// Calculate portfolio statistics
export async function calculatePortfolioStats(portfolioId: string) {
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/stats`, { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("calculatePortfolioStats failed:", data?.error)
      return { totalValue: 0, assetCount: 0, allocation: [] }
    }
    return {
      totalValue: data?.totalValue ?? 0,
      assetCount: data?.assetCount ?? 0,
      allocation: data?.allocation ?? [],
    }
  } catch (e) {
    console.warn("calculatePortfolioStats error:", e)
    return { totalValue: 0, assetCount: 0, allocation: [] }
  }
}

