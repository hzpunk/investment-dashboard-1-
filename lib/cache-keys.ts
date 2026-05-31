import "server-only"

import { createHash } from "crypto"

export const cachePrefix = "investment:v1"

function safeSegment(value: string) {
  return encodeURIComponent(value)
}

export function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16)
}

export const cacheKeys = {
  userRoot: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}`,
  userAll: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:*`,
  userDashboardSummary: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:dashboard-summary`,
  userAccounts: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:accounts`,
  userPortfolioAllocation: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:portfolio-allocation`,
  userPortfolioSummary: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:portfolio-summary`,
  userPortfolio: (userId: string, portfolioId: string) =>
    `${cachePrefix}:user:${safeSegment(userId)}:portfolio:${safeSegment(portfolioId)}:summary`,
  userPortfolios: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:portfolios`,
  userTransactions: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:transactions`,
  userAnalytics: (userId: string, rangeKey: string) =>
    `${cachePrefix}:user:${safeSegment(userId)}:analytics:${shortHash(rangeKey)}`,
  userAnalyticsPattern: (userId: string) => `${cachePrefix}:user:${safeSegment(userId)}:analytics:*`,
  allUserDashboardSummaries: () => `${cachePrefix}:user:*:dashboard-summary`,
  allUserPortfolioAllocations: () => `${cachePrefix}:user:*:portfolio-allocation`,
  allUserPortfolioSummaries: () => `${cachePrefix}:user:*:portfolio-summary`,
  allUserAnalytics: () => `${cachePrefix}:user:*:analytics:*`,
  assetsList: () => `${cachePrefix}:reference:assets`,
  marketAsset: (symbol: string) => `${cachePrefix}:market:asset:${safeSegment(symbol.toUpperCase())}`,
  marketCryptoPrices: (symbolsHash: string) => `${cachePrefix}:market:prices:${safeSegment(symbolsHash)}`,
  marketHistoricalPrices: (symbol: string, type: string, timeframe: string) =>
    `${cachePrefix}:market:historical:${safeSegment(symbol.toUpperCase())}:${safeSegment(type)}:${safeSegment(timeframe)}`,
  marketStockPrice: (symbol: string) => `${cachePrefix}:market:stock:${safeSegment(symbol.toUpperCase())}`,
  marketAll: () => `${cachePrefix}:market:*`,
}
