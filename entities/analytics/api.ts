import { supabase } from "@/shared/api/supabase"

// Get portfolio performance over time
export async function getPortfolioPerformance(userId: string, period: string) {
  // In a real app, you would calculate this from transaction history
  // For now, we'll generate some sample data

  let days = 30
  switch (period) {
    case "1M":
      days = 30
      break
    case "3M":
      days = 90
      break
    case "6M":
      days = 180
      break
    case "1Y":
      days = 365
      break
    case "All":
      days = 1000
      break
  }

  return generatePerformanceData(days)
}

// Get asset allocation
export async function getAssetAllocation(userId: string) {
  try {
    // Get user's portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from("portfolios")
      .select("id")
      .eq("user_id", userId)

    if (portfoliosError) throw portfoliosError

    if (!portfolios || portfolios.length === 0) {
      return []
    }

    // Get portfolio assets with their types
    const { data: portfolioAssets, error: assetsError } = await supabase
      .from("portfolio_assets")
      .select(`
        portfolio_id,
        asset_id,
        quantity,
        assets(id, type, current_price)
      `)
      .in(
        "portfolio_id",
        portfolios.map((p) => p.id),
      )

    if (assetsError) throw assetsError

    // Group by asset type
    const assetsByType = portfolioAssets.reduce(
      (acc, item) => {
        const asset = item.assets
        const type = asset.type
        const value = item.quantity * asset.current_price

        if (!acc[type]) {
          acc[type] = { type, value: 0 }
        }

        acc[type].value += value
        return acc
      },
      {} as Record<string, { type: string; value: number }>,
    )

    return Object.values(assetsByType)
  } catch (error) {
    console.error("Error getting asset allocation:", error)
    return []
  }
}

// Get transaction statistics
export async function getTransactionStats(userId: string) {
  try {
    // Get transaction count by type
    const { data, error } = await supabase
      .from("transactions")
      .select("type, count")
      .eq("user_id", userId)
      .group("type")

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error getting transaction stats:", error)
    return []
  }
}

// Generate sample performance data
function generatePerformanceData(days: number) {
  const data = []
  const today = new Date()
  let value = 50 + Math.random() * 10

  for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 20))) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)

    // Add some randomness to the value
    value += (Math.random() - 0.48) * 3
    value = Math.max(30, Math.min(70, value))

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    })
  }

  return data
}

