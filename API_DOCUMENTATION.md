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
