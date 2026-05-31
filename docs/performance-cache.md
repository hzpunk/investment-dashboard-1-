# Server-Side Cache

Redis is an optional server-side cache for repeated calculations and shared market/reference data. PostgreSQL remains the source of truth, and React Query remains the client-side cache.

## Local Setup

Start local infrastructure:

```bash
docker compose -f docker-compose.dev.yml up -d db ai redis
pnpm dev
```

Check Redis:

```bash
pnpm redis:ping
```

Environment variables:

```env
REDIS_URL="redis://127.0.0.1:6379"
CACHE_ENABLED="true"
```

For the Docker app container:

```env
REDIS_URL="redis://redis:6379"
CACHE_ENABLED="true"
```

Set `CACHE_ENABLED="false"` to bypass Redis. If Redis is enabled but unavailable, the app logs a development warning and falls back to direct database/service work.

## Key Structure

All private financial cache keys include the authenticated user id:

```text
investment:v1:user:{userId}:accounts
investment:v1:user:{userId}:dashboard-summary
investment:v1:user:{userId}:portfolio-allocation
investment:v1:user:{userId}:portfolio-summary
investment:v1:user:{userId}:portfolio:{portfolioId}:summary
investment:v1:user:{userId}:portfolios
investment:v1:user:{userId}:analytics:{rangeHash}
```

Shared market/reference keys:

```text
investment:v1:reference:assets
investment:v1:market:prices:{symbolsHash}
investment:v1:market:historical:{symbol}:{type}:{timeframe}
investment:v1:market:stock:{symbol}
investment:v1:market:asset:{symbol}
```

Emails are not used in cache keys.

## Cached Data And TTLs

| Data | TTL |
| --- | ---: |
| Accounts list | 60s |
| Portfolio list/detail | 120s |
| Portfolio summary/allocation | 120s |
| Analytics range response | 300s |
| Asset reference/price list | 1800s |
| Crypto prices | 60s |
| Historical prices | 2700s |
| Stock provider response | 900s |

## Invalidation

Mutation routes invalidate scoped Redis keys after successful database writes:

| Mutation | Invalidated |
| --- | --- |
| Create/update/delete account | user accounts, dashboard, portfolio summary/allocation, analytics |
| Create transaction | user transactions, accounts, dashboard, portfolio summary/allocation, analytics |
| Create/update/delete portfolio | user portfolios, portfolio detail, dashboard, portfolio summary/allocation, analytics |
| Add/remove portfolio asset | affected portfolio, portfolios, dashboard, portfolio summary/allocation, analytics |
| Create/update/delete asset | asset reference/market keys and all user derived financial summaries |
| Refresh asset prices | updated market keys and all user derived financial summaries |

The app never flushes the full Redis database.

## Debugging

Development logs include concise cache events:

```text
[ServerCache] HIT portfolio-summary user=...
[ServerCache] MISS analytics user=...
[ServerCache] SET analytics user=... ttl=300s
[CacheInvalidation] INVALIDATE user-portfolio user=...
```

No financial values are logged.
