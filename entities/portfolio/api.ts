export type Portfolio = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: string
}

export type PortfolioInsert = Omit<Portfolio, "id" | "createdAt" | "userId"> & { createdAt?: string }
type PortfolioAsset = {
  portfolio_id: string
  asset_id: string
  quantity: number
  average_buy_price: number
}
type PortfolioAssetInsert = PortfolioAsset

// Fetch all portfolios for a user
export async function fetchPortfolios() {
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
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(portfolioId)}`, { method: "GET" })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("fetchPortfolioWithAssets failed:", data?.error)
      return null
    }
    return data?.portfolio || null
  } catch (e) {
    console.warn("fetchPortfolioWithAssets error:", e)
    return null
  }
}

// Create a new portfolio
export async function createPortfolio(portfolio: PortfolioInsert) {
  try {
    const res = await fetch("/api/data/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(portfolio),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("createPortfolio failed:", data?.error)
      return null
    }
    return data?.portfolio || null
  } catch (e) {
    console.warn("createPortfolio error:", e)
    return null
  }
}

// Update a portfolio
export async function updatePortfolio(id: string, updates: Partial<Portfolio>) {
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("updatePortfolio failed:", data?.error)
      return null
    }
    return data?.portfolio || null
  } catch (e) {
    console.warn("updatePortfolio error:", e)
    return null
  }
}

// Delete a portfolio
export async function deletePortfolio(id: string) {
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("deletePortfolio failed:", data?.error)
      return null
    }
    return data?.success || false
  } catch (e) {
    console.warn("deletePortfolio error:", e)
    return null
  }
}

// Add an asset to a portfolio
export async function addAssetToPortfolio(portfolioAsset: PortfolioAssetInsert) {
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(portfolioAsset.portfolio_id)}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: portfolioAsset.asset_id,
        quantity: portfolioAsset.quantity,
        averageBuyPrice: portfolioAsset.average_buy_price,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("addAssetToPortfolio failed:", data?.error)
      return null
    }
    return data?.portfolioAsset || null
  } catch (e) {
    console.warn("addAssetToPortfolio error:", e)
    return null
  }
}

// Update a portfolio asset
export async function updatePortfolioAsset(portfolioId: string, assetId: string, updates: Partial<PortfolioAsset>) {
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/assets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, ...updates }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("updatePortfolioAsset failed:", data?.error)
      return null
    }
    return data?.portfolioAsset || null
  } catch (e) {
    console.warn("updatePortfolioAsset error:", e)
    return null
  }
}

// Remove an asset from a portfolio
export async function removeAssetFromPortfolio(portfolioId: string, assetId: string) {
  try {
    const res = await fetch(`/api/data/portfolios/${encodeURIComponent(portfolioId)}/assets?assetId=${encodeURIComponent(assetId)}`, {
      method: "DELETE",
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn("removeAssetFromPortfolio failed:", data?.error)
      return null
    }
    return data?.success || false
  } catch (e) {
    console.warn("removeAssetFromPortfolio error:", e)
    return null
  }
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

