# Performance Optimization Report

## Critical Issues

### 1. N+1 Query Problems

**Location:** `app/api/analytics/route.ts`
**Issue:** 3 separate database queries executed sequentially
**Impact:** ~600ms for large datasets

**Fix:** Use `Promise.all()` for parallel queries:
```typescript
const [transactions, accounts, portfolios] = await Promise.all([
  prisma.transaction.findMany({...}),
  prisma.account.findMany({...}),
  prisma.portfolio.findMany({...})
])
```

### 2. Missing Pagination

**Locations:**
- `app/api/analytics/route.ts` - loads ALL transactions
- `app/api/export/route.ts` - no limit on export
- `app/api/dividends/route.ts` - no pagination

**Impact:** Memory exhaustion with 10k+ records

**Fix:** Add pagination to all list endpoints:
```typescript
const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
const offset = parseInt(searchParams.get('offset') || '0')
```

### 3. Sequential API Calls in Dashboard

**Location:** `app/(dashboard)/dashboard/page.tsx:61-84`
**Issue:** 6 API calls execute sequentially
**Impact:** ~1.4s load time

**Fix:** Parallel execution:
```typescript
const [accounts, transactions, goals, portfolios] = await Promise.all([
  fetchAccounts(user.id),
  fetchRecentTransactions(user.id, 5),
  fetchGoals(user.id),
  fetchPortfolios(user.id)
])
```

### 4. No Server-Side Caching

**Issue:** Every request hits database
**Impact:** Unnecessary load on DB

**Fix:** Add Next.js cache headers:
```typescript
export async function GET() {
  const data = await getAnalyticsData()
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=60' // 1 minute cache
    }
  })
}
```

### 5. Inefficient Aggregations

**Location:** `app/api/analytics/route.ts`
**Issue:** JavaScript aggregation instead of SQL

**Fix:** Use Prisma aggregations:
```typescript
const { _sum: { totalAmount } } = await prisma.transaction.aggregate({
  where: { userId, type: 'buy' },
  _sum: { totalAmount: true }
})
```

## Recommended Priority

1. **High:** Fix pagination on analytics and export
2. **High:** Parallelize dashboard API calls
3. **Medium:** Add caching headers
4. **Medium:** Use SQL aggregations
5. **Low:** Add request debouncing

## Quick Wins

```typescript
// 1. Add pagination defaults
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 1000

// 2. Use Promise.all for parallel queries
const results = await Promise.all([
  query1(),
  query2(),
  query3()
])

// 3. Add simple in-memory cache for expensive queries
const cache = new Map()
const CACHE_TTL = 60000 // 1 minute

// 4. Use Prisma's select to reduce data transfer
prisma.transaction.findMany({
  select: { id: true, amount: true, date: true }
})
```
