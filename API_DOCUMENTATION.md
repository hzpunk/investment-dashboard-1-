# API Documentation - InvestTrack

## Authentication

All API endpoints require authentication via session cookie (HTTP-only).

## Base URL
```
/api
```


## Unified Response Contract

JSON API routes return one of two envelopes.

Success:
```json
{
  "ok": true,
  "data": {},
  "message": "Optional server message",
  "meta": {}
}
```

Error:
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Safe public error message",
    "details": {},
    "requestId": "optional-request-id"
  }
}
```

Frontend code should map stable `error.code` values to i18n messages and must not show raw backend, provider, SQL, token, cookie, or secret details to users.

Common error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, `DATABASE_ERROR`, `CACHE_ERROR`.

AI error codes: `AI_PROVIDER_UNAVAILABLE`, `AI_PROVIDER_TIMEOUT`, `AI_PROVIDER_BAD_REQUEST`, `AI_CONTEXT_UNAVAILABLE`, `AI_EMPTY_RESPONSE`.

## Data Export API

### `POST /api/export/summary`

Returns JSON export summary metadata using the unified response contract. This endpoint does not generate a file and is safe to call from the page preview button.

Request body:

```json
{
  "format": "pdf",
  "sections": {
    "portfolioSummary": true,
    "accounts": true,
    "assets": true,
    "holdings": true,
    "transactions": true,
    "analytics": true,
    "allocationChart": true,
    "performanceChart": true,
    "metadata": true
  },
  "period": { "type": "all" },
  "options": {
    "title": "Investment report",
    "language": "ru",
    "currency": "USD",
    "includeCharts": true,
    "includeQrCode": true,
    "includeAppLink": true,
    "detailedMode": false,
    "orientation": "portrait",
    "pageSize": "A4"
  }
}
```

### `POST /api/export`

Returns a generated file. Binary downloads include `Content-Type` and `Content-Disposition`, for example:

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="investment-report-2026-06-04.pdf"
```

Fully implemented formats: `pdf`, `docx`, `csv`, `xlsx`, `txt`, `json`.

Planned/disabled formats return `EXPORT_FORMAT_NOT_IMPLEMENTED` with HTTP 422 before any generator is called: `html`.

Compatibility note: `POST /api/export/preview` returns the same summary structure as `/api/export/summary`. It is no longer an exact visual document preview.

Status mapping: invalid request body and empty sections return 400, unauthenticated requests return 401, forbidden admin-only sections return 403, unsupported or planned formats return 422, and unexpected internal generation failures return safe 500 JSON.

Export-specific error codes: `EXPORT_FORMAT_NOT_SUPPORTED`, `EXPORT_FORMAT_NOT_IMPLEMENTED`, `EXPORT_NO_SECTIONS_SELECTED`, `EXPORT_NO_DATA`, `EXPORT_LAYOUT_OVERLAP`, `EXPORT_LAYOUT_FAILED`, `EXPORT_GENERATION_FAILED`, `EXPORT_FONT_FAILED`, `EXPORT_QR_FAILED`, `EXPORT_CHART_RENDER_FAILED`, `EXPORT_CHART_SNAPSHOT_FAILED`.

PDF exports embed Noto Sans TTF fonts from `assets/fonts` for Cyrillic text. Font failures return `EXPORT_FONT_FAILED`; layout failures return `EXPORT_LAYOUT_FAILED`. QR code placement is reserved in a separate app-link section and validated before the binary response is returned.

The summary endpoint returns a contents summary with section details and record estimates. It does not generate binary files. The export page calls `POST /api/export` only when the user clicks Download. Browser print is intentionally not exposed for this module.

Chart export behavior is format-specific: PDF draws simple allocation/performance charts from server data, DOCX includes chart source tables with a precise note, and CSV/XLSX/JSON/TXT export source rows or compact summaries. JSON is compact by default; set `options.detailedMode=true` to include projection point arrays and extended calculation details.

The export API requires authentication. Users can export only their own data. Admin-only sections require admin role. Generated files are returned on demand and are not stored permanently.

AI chat success example:
```json
{
  "ok": true,
  "data": {
    "message": "Assistant answer",
    "contextStatus": {
      "portfolio": "available",
      "accounts": "available",
      "marketData": "partial"
    },
    "timestamp": "2026-06-01T00:00:00.000Z"
  },
  "message": "AI response generated"
}
```

AI provider error example:
```json
{
  "ok": false,
  "error": {
    "code": "AI_PROVIDER_UNAVAILABLE",
    "message": "AI assistant is temporarily unavailable"
  }
}
```

HTTP status mapping: `200` success, `201` created, `400` invalid request or validation, `401` unauthenticated, `403` forbidden, `404` missing entity, `409` conflict, `429` rate limited, `500` internal error, `502` upstream rejected or invalid response, `503` upstream unavailable, `504` upstream timeout.

## Endpoints

### Analytics

#### GET /api/analytics
Returns portfolio analytics and metrics.

**Response:**
```json
{
  "summary": {
    "totalValue": 100000,
    "totalInvested": 90000,
    "returns": {
      "total": 10000,
      "totalPercent": 11.11,
      "realized": 5000,
      "unrealized": 5000
    },
    "accountsCount": 3,
    "portfoliosCount": 2
  },
  "allocation": [
    {
      "asset": "AAPL",
      "name": "Apple Inc.",
      "type": "stock",
      "quantity": 100,
      "value": 15000,
      "percent": 15
    }
  ],
  "transactionStats": {
    "total": 50,
    "buy": 30,
    "sell": 10,
    "dividend": 10
  },
  "monthlyPerformance": [...],
  "topHoldings": [...]
}
```

### Export

#### GET /api/export?type=transactions&format=csv
Export data as CSV or JSON.

**Parameters:**
- `type`: `transactions` | `portfolio` | `tax-report`
- `format`: `csv` | `json`

**Response:** File download (text/csv or application/json)

### Import

#### POST /api/import
Import transactions from CSV or JSON file.

**Request:**
```multipart/form-data
file: <File>
type: auto
```

**Response:**
```json
{
  "imported": 25,
  "skipped": 2,
  "errors": []
}
```

### Dividends

#### GET /api/dividends?year=2024
Get dividend history and projections.

**Response:**
```json
{
  "year": 2024,
  "summary": {
    "totalDividends": 2500.50,
    "dividendYield": 2.5,
    "monthlyAverage": 208.38,
    "transactionCount": 12
  },
  "byAsset": [...],
  "byMonth": { "01": 150, "02": 200, ... },
  "recentDividends": [...]
}
```

#### POST /api/dividends
Record a dividend payment.

**Request:**
```json
{
  "assetId": "asset-id",
  "accountId": "account-id",
  "amount": 150.50,
  "date": "2024-01-15",
  "currency": "USD",
  "notes": "Q4 dividend"
}
```

### Notifications

#### GET /api/notifications?unread=true&limit=20
Get user notifications.

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-id",
      "title": "Dividend Received",
      "message": "Received $150.50 from AAPL",
      "type": "dividend",
      "read": false,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

#### PATCH /api/notifications
Mark notifications as read.

**Request:**
```json
{
  "all": true
}
// or
{
  "id": "notif-id"
}
```

### Portfolio Rebalancing

#### GET /api/portfolio/rebalance
Get available rebalancing strategies.

**Response:**
```json
{
  "strategies": [
    {
      "id": "threshold",
      "name": "Threshold Rebalancing",
      "description": "...",
      "params": { ... }
    }
  ]
}
```

#### POST /api/portfolio/rebalance
Calculate rebalancing recommendations.

**Request:**
```json
{
  "portfolioId": "portfolio-id",
  "strategy": "threshold",
  "targetAllocation": [
    { "assetId": "asset-1", "targetPercent": 40 },
    { "assetId": "asset-2", "targetPercent": 60 }
  ]
}
```

**Response:**
```json
{
  "portfolioId": "portfolio-id",
  "totalValue": 100000,
  "needsRebalancing": true,
  "currentAllocation": [...],
  "targetAllocation": [
    {
      "assetId": "asset-1",
      "currentPercent": 35,
      "targetPercent": 40,
      "valueDiff": 5000,
      "action": "buy"
    }
  ],
  "summary": {
    "tradesNeeded": 2,
    "totalBuyValue": 5000,
    "totalSellValue": 3000,
    "estimatedFees": 8
  }
}
```

### AI Assistant

#### POST /api/ai/chat
Send a user message to the portfolio-aware assistant. The browser must call only this internal route; the backend calls LM Studio server-side through `OLLAMA_URL`.

**Request:**
```json
{
  "message": "Что у меня с портфелем?"
}
```

Optional conversation history:
```json
{
  "messages": [
    { "role": "user", "content": "Какие активы у меня есть?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "message": "Ответ ассистента",
  "contextStatus": {
    "portfolio": "available",
    "accounts": "available",
    "marketData": "partial"
  },
  "timestamp": "2026-06-01T00:00:00.000Z"
}
```

**Error response:**
```json
{
  "error": "AI assistant is temporarily unavailable",
  "message": "AI-ассистент временно недоступен. Проверьте подключение к локальной модели."
}
```

### Data Endpoints

#### GET /api/data/accounts
List user accounts.

#### POST /api/data/accounts
Create new account.

#### GET /api/data/transactions
List user transactions.

#### POST /api/data/transactions
Create new transaction.

#### GET /api/data/goals
List financial goals.

#### POST /api/data/goals
Create new goal.

#### GET /api/data/profiles
Get user profile.

#### PUT /api/data/profiles
Update user profile.

### Auth Endpoints

#### POST /api/auth/register
Register new user.

#### POST /api/auth/login
User login.

#### POST /api/auth/logout
User logout.

#### GET /api/auth/me
Get current user.

#### POST /api/auth/password
Update password.

## Legacy Error Handling Note

Older examples below may show pre-standardization response shapes. New and refactored JSON routes use the unified `ok/data/error` contract above.

## Error Handling

All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"  // optional
}
```

HTTP Status Codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated endpoints

## Data Types

### Transaction Types
- `buy` - Purchase asset
- `sell` - Sell asset
- `dividend` - Dividend payment
- `interest` - Interest payment
- `deposit` - Cash deposit
- `withdrawal` - Cash withdrawal

### Asset Types
- `stock` - Individual stocks
- `bond` - Bonds
- `etf` - Exchange-traded funds
- `crypto` - Cryptocurrencies
- `commodity` - Commodities
- `other` - Other assets

### Account Types
- `brokerage` - Brokerage account
- `bank` - Bank account
- `crypto` - Crypto exchange
- `retirement` - Retirement account (IRA, 401k)
- `other` - Other account types

## Data Export API Presentation Contract

`POST /api/export` and `POST /api/export/summary` keep the unified API error contract for JSON errors:

```json
{ "ok": false, "error": { "code": "EXPORT_GENERATION_FAILED", "message": "Safe public message" } }
```

Successful binary downloads are returned as file responses with the correct `Content-Type` and `Content-Disposition`; they are not wrapped in `{ ok:true }`.

User-facing export mode is the default. In this mode the server maps collected portfolio data through `lib/export/presentation/*` before generation:

- section titles are localized (`Сводка портфеля`, `Счета`, `Распределение активов` / `Portfolio summary`, `Accounts`, `Asset allocation`);
- table headers are localized (`Стоимость портфеля`, `Название`, `Текущая цена` / `Portfolio value`, `Name`, `Current price`);
- enum values are localized for asset, account, transaction, and risk types;
- internal IDs and implementation keys (`id`, `key`, `assetId`, `portfolioId`, `accountId`, `userId`) are removed from document/spreadsheet/text rows;
- money, percentages, numbers, and dates are formatted for the requested report language.

Default JSON export is compact and public-facing:

```json
{
  "meta": {
    "generatedAt": "2026-06-05T08:23:00.000Z",
    "generatedAtFormatted": "05.06.2026 08:23",
    "applicationUrl": "http://localhost:3000",
    "language": "ru",
    "formatVersion": "1.0"
  },
  "portfolio": {
    "summary": {
      "portfolioValue": 21588.75,
      "investedAmount": 20015,
      "profitLoss": 1573.75,
      "returnPercent": 7.86
    }
  },
  "analytics": {
    "allocation": [],
    "performance": { "summary": {} }
  }
}
```

The default JSON response does not include QR code base64/SVG, chart snapshots, raw DTO field names, database IDs, or full projection point arrays. Detailed/technical export mode can include extended calculation details when explicitly selected.

### Export Format Registry

Format support is centralized in `lib/export/formats.ts`.

Implemented formats:

- `pdf`: `application/pdf`
- `docx`: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `txt`: `text/plain; charset=utf-8`
- `csv`: `text/csv; charset=utf-8`
- `xlsx`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `xls`: `application/vnd.ms-excel`
- `ods`: `application/vnd.oasis.opendocument.spreadsheet`
- `json`: `application/json; charset=utf-8`
- `xml`: `application/xml; charset=utf-8`

Planned/disabled formats return `EXPORT_FORMAT_NOT_IMPLEMENTED` with HTTP 422: `html`.

CSV export is UTF-8 with BOM for Windows Excel compatibility and uses `;` as the default delimiter. CSV cells normalize non-breaking spaces to regular spaces and quote values containing delimiters, quotes, or line breaks.

XML export uses stable public tag names and escapes XML special characters. It does not include internal IDs, QR image payloads, chart snapshots, or raw projection internals in default user mode.

Financial format exports:

- `qif`: `application/qif; charset=utf-8`, file extension `.qif`, exports investment and bank transaction records.
- `ofx`: `application/x-ofx; charset=utf-8`, file extension `.ofx`, exports an OFX 2.x XML-style statement with `<STMTTRN>` entries.
- `mt940`: `text/plain; charset=utf-8`, file extension `.sta`, exports a simplified SWIFT MT940-like statement.
- `camt053`: `application/xml; charset=utf-8`, file extension `.xml`, exports a simplified ISO 20022 CAMT.053 XML statement.

Financial formats primarily export `accounts`, `transactions`, and `metadata`. Visual/report sections are ignored with a `FINANCIAL_SECTIONS_ONLY` summary warning. Generated references are hashes of safe public transaction fields and do not expose database IDs.
