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
- Multi-currency values are displayed in USD-style formatting because no FX conversion layer exists yet.
- Calculations are approximate and are not financial, investment or tax advice.

## Verification

- `pnpm run test:finance`
- `pnpm test`
- `pnpm run test:i18n`
- `pnpm typecheck`

