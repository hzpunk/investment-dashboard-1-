import "server-only"

import { cacheKeys } from "@/lib/cache-keys"
import { createLogger } from "@/lib/logger"
import { safeRedisDel, safeRedisDelByPattern } from "@/lib/redis"

const logger = createLogger("CacheInvalidation")

async function del(keys: string[]) {
  const results = await Promise.all(keys.map((key) => safeRedisDel(key)))
  return results.reduce((sum, count) => sum + count, 0)
}

async function delPatterns(patterns: string[]) {
  const results = await Promise.all(patterns.map((pattern) => safeRedisDelByPattern(pattern)))
  return results.reduce((sum, count) => sum + count, 0)
}

function logInvalidation(scope: string, userId?: string, count?: number) {
  if (process.env.NODE_ENV !== "production") {
    logger.info(`INVALIDATE ${scope}${userId ? ` user=${userId}` : ""}${typeof count === "number" ? ` deleted=${count}` : ""}`)
  }
}

export async function invalidateUserDashboardCache(userId: string) {
  const count = await del([
    cacheKeys.userDashboardSummary(userId),
    cacheKeys.userPortfolioAllocation(userId),
    cacheKeys.userPortfolioSummary(userId),
  ])
  await delPatterns([cacheKeys.userAnalyticsPattern(userId)])
  logInvalidation("user-dashboard", userId, count)
}

export async function invalidateUserAccountsCache(userId: string) {
  const count = await del([
    cacheKeys.userAccounts(userId),
    cacheKeys.userDashboardSummary(userId),
    cacheKeys.userPortfolioAllocation(userId),
    cacheKeys.userPortfolioSummary(userId),
  ])
  await delPatterns([cacheKeys.userAnalyticsPattern(userId)])
  logInvalidation("user-accounts", userId, count)
}

export async function invalidateUserTransactionsCache(userId: string) {
  const count = await del([
    cacheKeys.userTransactions(userId),
    cacheKeys.userAccounts(userId),
    cacheKeys.userDashboardSummary(userId),
    cacheKeys.userPortfolioAllocation(userId),
    cacheKeys.userPortfolioSummary(userId),
  ])
  await delPatterns([cacheKeys.userAnalyticsPattern(userId)])
  logInvalidation("user-transactions", userId, count)
}

export async function invalidateUserPortfolioCache(userId: string, portfolioId?: string) {
  const keys = [
    cacheKeys.userPortfolios(userId),
    cacheKeys.userDashboardSummary(userId),
    cacheKeys.userPortfolioAllocation(userId),
    cacheKeys.userPortfolioSummary(userId),
  ]

  if (portfolioId) {
    keys.push(cacheKeys.userPortfolio(userId, portfolioId))
  }

  const count = await del(keys)
  await delPatterns([cacheKeys.userAnalyticsPattern(userId)])
  logInvalidation("user-portfolio", userId, count)
}

export async function invalidateUserAnalyticsCache(userId: string) {
  const count = await delPatterns([cacheKeys.userAnalyticsPattern(userId)])
  logInvalidation("user-analytics", userId, count)
}

export async function invalidateUserAllFinancialCache(userId: string) {
  const count = await delPatterns([cacheKeys.userAll(userId)])
  logInvalidation("user-financial-cache", userId, count)
}

export async function invalidateAllUsersDerivedFinancialCache() {
  const count = await delPatterns([
    cacheKeys.allUserDashboardSummaries(),
    cacheKeys.allUserPortfolioAllocations(),
    cacheKeys.allUserPortfolioSummaries(),
    cacheKeys.allUserAnalytics(),
  ])
  logInvalidation("all-users-derived-financial", undefined, count)
}

export async function invalidateMarketCache(symbol?: string) {
  const normalizedSymbol = symbol?.trim().toUpperCase()
  const count = normalizedSymbol
    ? await del([
        cacheKeys.marketAsset(normalizedSymbol),
        cacheKeys.marketStockPrice(normalizedSymbol),
        cacheKeys.assetsList(),
      ])
    : await delPatterns([cacheKeys.marketAll(), cacheKeys.assetsList()])

  if (normalizedSymbol) {
    await delPatterns([cacheKeys.marketHistoricalPrices(normalizedSymbol, "*", "*")])
  }

  logInvalidation(`market${normalizedSymbol ? ` symbol=${normalizedSymbol}` : ""}`, undefined, count)
}
