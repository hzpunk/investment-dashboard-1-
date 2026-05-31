-- Indexes for authenticated dashboard route transitions and cache-backed page reloads.
-- These match audited query patterns: user-scoped lists ordered by date/createdAt,
-- transaction filters joined to accounts/assets, and reusable market-data cache lookups.

CREATE INDEX "Account_userId_createdAt_idx" ON "Account"("userId", "createdAt");
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_userId_accountId_date_idx" ON "Transaction"("userId", "accountId", "date");
CREATE INDEX "Transaction_userId_assetId_date_idx" ON "Transaction"("userId", "assetId", "date");
CREATE INDEX "Portfolio_userId_createdAt_idx" ON "Portfolio"("userId", "createdAt");
CREATE INDEX "Goal_userId_createdAt_idx" ON "Goal"("userId", "createdAt");
CREATE INDEX "MarketDataCache_symbol_dataType_expiresAt_lastUpdated_idx" ON "MarketDataCache"("symbol", "dataType", "expiresAt", "lastUpdated");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
