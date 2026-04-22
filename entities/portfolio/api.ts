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
  const res = await fetch("/api/data/portfolios", { method: "GET" })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "Failed to fetch portfolios")
  return (data?.portfolios as Portfolio[]) || []
}

// Fetch a single portfolio with its assets
export async function fetchPortfolioWithAssets(portfolioId: string) {
  throw new Error(`Not implemented: fetchPortfolioWithAssets(${portfolioId})`)
}

// Create a new portfolio
export async function createPortfolio(portfolio: PortfolioInsert) {
  throw new Error(`Not implemented: createPortfolio(${portfolio.name})`)
}

// Update a portfolio
export async function updatePortfolio(id: string, updates: Partial<Portfolio>) {
  throw new Error(`Not implemented: updatePortfolio(${id})`)
}

// Delete a portfolio
export async function deletePortfolio(id: string) {
  throw new Error(`Not implemented: deletePortfolio(${id})`)
}

// Add an asset to a portfolio
export async function addAssetToPortfolio(portfolioAsset: PortfolioAssetInsert) {
  throw new Error(`Not implemented: addAssetToPortfolio(${portfolioAsset.portfolioId})`)
}

// Update a portfolio asset
export async function updatePortfolioAsset(portfolioId: string, assetId: string, updates: Partial<PortfolioAsset>) {
  throw new Error(`Not implemented: updatePortfolioAsset(${portfolioId}, ${assetId})`)
}

// Remove an asset from a portfolio
export async function removeAssetFromPortfolio(portfolioId: string, assetId: string) {
  throw new Error(`Not implemented: removeAssetFromPortfolio(${portfolioId}, ${assetId})`)
}

// Calculate portfolio statistics
export async function calculatePortfolioStats(portfolioId: string) {
  const res = await fetch(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/stats`, { method: "GET" })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || "Failed to calculate portfolio stats")
  return {
    totalValue: data?.totalValue ?? 0,
    assetCount: data?.assetCount ?? 0,
    allocation: data?.allocation ?? [],
  }
}

