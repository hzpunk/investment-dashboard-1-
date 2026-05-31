export type AssetTypeValue = "stock" | "bond" | "etf" | "crypto" | "commodity" | "other"

export type AssetPreset = {
  symbol: string
  name: string
  type: AssetTypeValue
  currency: "USD" | "EUR" | "RUB" | "GBP"
  defaultPrice?: number
}

export const supportedAssetCurrencies = ["USD", "EUR", "RUB", "GBP"] as const

export const customAssetPresetValue = "custom"

export const assetPresetsByType: Record<AssetTypeValue, AssetPreset[]> = {
  crypto: [
    { symbol: "BTC", name: "Bitcoin", type: "crypto", currency: "USD", defaultPrice: 105000 },
    { symbol: "ETH", name: "Ethereum", type: "crypto", currency: "USD", defaultPrice: 3800 },
    { symbol: "SOL", name: "Solana", type: "crypto", currency: "USD", defaultPrice: 170 },
    { symbol: "BNB", name: "BNB", type: "crypto", currency: "USD", defaultPrice: 690 },
    { symbol: "XRP", name: "XRP", type: "crypto", currency: "USD", defaultPrice: 2.2 },
    { symbol: "DOGE", name: "Dogecoin", type: "crypto", currency: "USD", defaultPrice: 0.22 },
    { symbol: "TON", name: "Toncoin", type: "crypto", currency: "USD", defaultPrice: 5.5 },
    { symbol: "USDT", name: "Tether", type: "crypto", currency: "USD", defaultPrice: 1 },
    { symbol: "USDC", name: "USD Coin", type: "crypto", currency: "USD", defaultPrice: 1 },
  ],
  stock: [
    { symbol: "AAPL", name: "Apple Inc.", type: "stock", currency: "USD", defaultPrice: 195 },
    { symbol: "MSFT", name: "Microsoft", type: "stock", currency: "USD", defaultPrice: 425 },
    { symbol: "NVDA", name: "NVIDIA", type: "stock", currency: "USD", defaultPrice: 1120 },
    { symbol: "TSLA", name: "Tesla", type: "stock", currency: "USD", defaultPrice: 180 },
    { symbol: "GOOGL", name: "Alphabet", type: "stock", currency: "USD", defaultPrice: 175 },
    { symbol: "AMZN", name: "Amazon", type: "stock", currency: "USD", defaultPrice: 185 },
    { symbol: "META", name: "Meta", type: "stock", currency: "USD", defaultPrice: 500 },
  ],
  etf: [
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF", type: "etf", currency: "USD", defaultPrice: 260 },
    { symbol: "VOO", name: "Vanguard S&P 500 ETF", type: "etf", currency: "USD", defaultPrice: 480 },
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "etf", currency: "USD", defaultPrice: 520 },
    { symbol: "QQQ", name: "Invesco QQQ Trust", type: "etf", currency: "USD", defaultPrice: 455 },
    { symbol: "GLD", name: "SPDR Gold Shares", type: "etf", currency: "USD", defaultPrice: 215 },
  ],
  commodity: [
    { symbol: "XAU", name: "Gold", type: "commodity", currency: "USD", defaultPrice: 2350 },
    { symbol: "XAG", name: "Silver", type: "commodity", currency: "USD", defaultPrice: 30 },
    { symbol: "USO", name: "United States Oil Fund", type: "commodity", currency: "USD", defaultPrice: 78 },
    { symbol: "GLD", name: "SPDR Gold Shares", type: "commodity", currency: "USD", defaultPrice: 215 },
    { symbol: "SLV", name: "iShares Silver Trust", type: "commodity", currency: "USD", defaultPrice: 27 },
  ],
  bond: [
    { symbol: "BND", name: "Vanguard Total Bond Market ETF", type: "bond", currency: "USD", defaultPrice: 72 },
    { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", type: "bond", currency: "USD", defaultPrice: 92 },
    { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", type: "bond", currency: "USD", defaultPrice: 98 },
  ],
  other: [],
}

