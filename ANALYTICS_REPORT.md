# Analytics Iteration Report

## What Changed

- Added a shared finance math layer in `lib/finance`.
- Rebuilt `/api/analytics` around a normalized DTO sourced from Prisma accounts, portfolio positions and transactions.
- Replaced the broken profitability chart pipeline with `PortfolioPerformancePoint`.
- Reworked portfolio allocation into a donut chart plus allocation table.
- Added risk, diversification and projection analytics to the analytics page.
- Updated AI portfolio context with compact analytics, risk and projection values.

## Data Flow

```text
PostgreSQL/Prisma
  -> lib/services/analytics.ts
  -> /api/analytics unified response
  -> entities/analytics/api.ts
  -> TanStack Query analyticsQuery
  -> PerformanceChart / PortfolioAllocation / analytics page
```

The dashboard no longer uses BTC historical prices as a portfolio performance proxy. It reads the same analytics DTO as the analytics page.

## Formulas

- Market Value = quantity * currentPrice
- Unrealized P&L = marketValue - quantity * averageBuyPrice
- P&L % = P&L / costBasis * 100
- Allocation % = assetValue / totalPortfolioValue * 100
- Simple Return = (currentValue - initialValue) / initialValue * 100
- CAGR = ((currentValue / initialValue)^(1 / years) - 1) * 100
- Diversification Score uses a normalized Herfindahl-Hirschman concentration score.
- Future Value = P * (1 + r / 12)^n
- Future Value with Contributions = P * (1 + i)^n + PMT * ((1 + i)^n - 1) / i

## Assumptions and Limitations

- Historical portfolio snapshots do not exist in the schema. Performance history is derived from transactions using transaction prices, with the final point marked to current asset prices.
- If neither transactions nor enough position history exist, charts show an explicit empty state instead of empty axes.
- Sector/category allocation is returned only when data exists; current schema does not store asset sector.
- Multi-currency account aggregation uses RUB as the base currency and official CBR rates when rates are available.
- Calculations are approximate and are not financial, investment or tax advice.

## Verification

- `pnpm run test:finance`
- `pnpm test`
- `pnpm run test:i18n`
- `pnpm typecheck`

## 2026-06-06 Account-Scoped Analytics Update

Analytics now accepts an account scope:

```ts
type AccountScope =
  | { type: "all" }
  | { type: "single"; accountId: string }
```

The browser passes `accountId=<id>` for a selected account. `accountId=all` or an omitted parameter means all accounts. The backend verifies account ownership through `resolveAccountScopeForUser()` before filtering Prisma queries.

Updated analytics flow:

```text
selected account scope
  -> /api/analytics?accountId=...
  -> resolveAccountScopeForUser()
  -> buildAnalyticsDto(userId, { accountScope })
  -> account-filtered transactions/accounts
  -> normalized AnalyticsDto
```

Single-account analytics derives holdings from transactions because `PortfolioAsset` rows in the current schema are portfolio-linked, not account-linked. All-account analytics keeps the existing mixed model: stored portfolio assets plus transaction-derived missing positions.

RUB is the base currency for analytics. When all accounts or account data contain non-RUB currencies, analytics requests official Bank of Russia daily rates from:

```text
https://www.cbr.ru/scripts/XML_daily.asp?date_req=dd/mm/yyyy
```

Conversion formulas:

```text
rubPerUnit = value / nominal
foreignToRub = amount * rubPerUnit
rubToForeign = amount / rubPerUnit
```

Rates are cached with Redis key `currency:rates:cbr:YYYY-MM-DD` for 12 hours and mirrored in process memory. If fresh CBR data is unavailable, stale cached values from up to seven previous days may be used and marked as stale. If no rate is available, analytics returns `conversionStatus: "unavailable"` or `"partial"` and does not invent rates.

`AnalyticsDto.currency` now reports base currency, conversion status, CBR source/date, stale status and warnings. Dashboard and analytics pages show account scope labels and conversion warnings when relevant.

## 2026-06-06 Display Currency Update

Analytics now uses a user-selected display currency instead of a fixed RUB base. The top-bar switcher stores one of `RUB`, `USD`, or `EUR` in `localStorage`; the dashboard and analytics pages include that value in the analytics query key and request:

```text
GET /api/analytics?accountId=all&currency=RUB
```

`buildAnalyticsDto()` normalizes the requested display currency and converts aggregate values through the shared currency conversion module. Single-account and all-account analytics use the same conversion status model:

- `none`: no conversion was needed;
- `converted`: all required values were converted;
- `partial`: some values could not be converted;
- `unavailable`: conversion could not be completed.

Charts, allocation totals, summary cards, positions and projection cards receive the analytics DTO currency and format values through `formatMoney()`. If rates are stale, partial or unavailable, the UI shows a reusable conversion warning badge instead of silently mixing currencies.

Critical conversion rule: analytics never changes a currency label without converting the numeric amount. Transaction-derived holdings convert both transaction amounts and nested asset `currentPrice` before positions, allocation, P&L and performance points are calculated. If a required rate is unavailable, that row contributes `0` to display-currency aggregates and the DTO returns `conversionStatus: "partial"` or `"unavailable"` with `CURRENCY_RATE_UNAVAILABLE`.

Historical performance charts currently use the available CBR reference rate for display conversion rather than per-transaction-date historical FX rates. When conversion is applied, analytics adds `CURRENCY_HISTORICAL_CONVERSION_APPROXIMATE` so the UI can warn that historical returns may differ when using rates from each operation date.
