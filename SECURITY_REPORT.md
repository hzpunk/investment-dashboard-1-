# Security Analysis Report - InvestTrack

## Executive Summary

**Overall Risk Level:** 🟡 MEDIUM-HIGH

Found **7 security vulnerabilities**, including 2 HIGH severity issues requiring immediate attention.

---

## 🔴 HIGH Severity Vulnerabilities

### 1. Missing Authorization Checks on File Upload (CWE-285)
**Location:** `app/api/import/route.ts:6-7`

```typescript
export async function POST(request: Request) {
  const user = await requireRequestUser()  // Outside try-catch!
```

**Risk:** If authentication fails, error is not caught and returns 500 instead of 401.
**Impact:** Information disclosure + potential DoS

**Remediation:**
```typescript
export async function POST(request: Request) {
  try {
    const user = await requireRequestUser()
    // ... rest of code
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // ...
  }
}
```

---

### 2. No Rate Limiting (CWE-770)
**Location:** All API endpoints

**Risk:** All endpoints vulnerable to brute force and DoS attacks
**Impact:** 
- Account takeover via brute force on `/api/auth/login`
- Database exhaustion via repeated expensive queries
- Financial data scraping

**Remediation:**
```typescript
// Add middleware or API route wrapper
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
```

---

## 🟡 MEDIUM Severity Vulnerabilities

### 3. Weak Password Policy (CWE-521)
**Location:** `app/api/auth/register/route.ts:16`

```typescript
if (password.length < 6) {
  return NextResponse.json({ error: 'Password too short' }, { status: 400 })
}
```

**Risk:** 
- Only 6 character minimum
- No complexity requirements
- No check against common passwords

**Remediation:**
```typescript
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
if (!PASSWORD_REGEX.test(password)) {
  return NextResponse.json({ 
    error: 'Password must be 8+ chars with uppercase, lowercase, number, and special char' 
  }, { status: 400 })
}
```

---

### 4. Missing CORS Configuration (CWE-942)
**Location:** `next.config.mjs`

**Risk:** API accessible from any origin
**Impact:** CSRF attacks possible

**Remediation:**
Use same-origin API calls from the Next.js app. Do not add permissive CORS headers unless a real cross-origin integration is introduced and explicitly allowlisted.

---

### 5. No Input Validation/Sanitization (CWE-20)
**Location:** All API endpoints accepting user input

**Risk:** 
- No Zod or similar validation
- Direct use of request body in database queries
- Potential NoSQL injection via JSON fields

**Example vulnerability:**
```typescript
const data = await request.json()  // No validation!
await prisma.transaction.create({ data: { ...data } })
```

**Remediation:**
```typescript
import { z } from 'zod'

const TransactionSchema = z.object({
  account_id: z.string().uuid(),
  type: z.enum(['buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal']),
  total_amount: z.number().positive(),
  quantity: z.number().positive().optional(),
  // ...
})

const data = TransactionSchema.parse(await request.json())
```

---

### 6. Session Security Issues (CWE-384)
**Location:** `lib/auth.ts:40-46`

```typescript
res.cookies.set(getSessionCookieName(), token, {
  httpOnly: true,
  sameSite: 'lax',  // Should be 'strict' for financial app
  secure: process.env.NODE_ENV === 'production',  // Missing in dev!
  path: '/',
  expires: expiresAt,  // 30 days - too long for financial data
})
```

**Issues:**
- `sameSite: 'lax'` allows cross-site GET requests
- Session TTL is 30 days (too long for financial data)
- No session invalidation on logout from all devices
- No device fingerprinting

**Remediation:**
```typescript
res.cookies.set(getSessionCookieName(), token, {
  httpOnly: true,
  sameSite: 'strict',  // Changed from 'lax'
  secure: true,  // Always secure
  path: '/',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
})
```

---

## 🟢 LOW Severity Issues

### 7. Information Disclosure in Error Messages (CWE-209)
**Location:** Multiple API files

**Example:**
```typescript
} catch (error) {
  console.error('Transaction create error:', error)  // Logs to client in dev!
  return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
}
```

**Risk:** Stack traces may leak in development mode

**Remediation:**
```typescript
} catch (error) {
  // Log to server only, never to client
  console.error('Transaction create error:', error)
  
  // Generic message to client
  return NextResponse.json(
    { error: 'Internal server error', code: 'TX_001' },
    { status: 500 }
  )
}
```

---

## 📊 Security Checklist

| Control | Status | Priority |
|---------|--------|----------|
| HTTPS Only | ⚠️ Partial (cookies not always secure) | HIGH |
| Rate Limiting | ⚠️ Partial (needs middleware) | HIGH |
| Input Validation | ⚠️ Partial (basic checks only) | HIGH |
| Password Policy | ✅ Strong (8+ chars, complexity) | - |
| CORS Policy | ❌ Missing | MEDIUM |
| Session Security | ⚠️ Partial (sameSite: lax) | MEDIUM |
| CSRF Protection | ⚠️ Partial (httpOnly cookies) | MEDIUM |
| Security Headers | ❌ Missing | LOW |
| Audit Logging | ✅ Implemented | - |
| SQL Injection Prevention | ✅ Prisma ORM | - |
| XSS Prevention | ⚠️ Partial | MEDIUM |
| Auth Wrapper | ✅ Centralized withAuth | - |
| Docker Security | ✅ Non-root, Alpine, healthchecks | - |

---

## 🛡️ Immediate Actions Required

### Priority 1 (Fix within 24 hours):
1. ✅ Add rate limiting to `/api/auth/login` and `/api/auth/register`
2. ✅ Move `requireRequestUser()` inside try-catch in `/api/import`
3. ✅ Strengthen password policy (min 8 chars + complexity)

### Priority 2 (Fix within 1 week):
4. ✅ Implement centralized `withAuth` wrapper for all API routes
5. ✅ Add `errorResponse` and `successResponse` helpers
6. ✅ Add health check endpoints for Docker
7. ⏳ Add Zod validation on all API inputs
8. ⏳ Add CORS configuration
9. ⏳ Fix session cookie settings (sameSite: 'strict', shorter TTL)

### Priority 3 (Fix within 1 month):
10. ⏳ Add security headers (CSP, HSTS, X-Frame-Options)
11. ⏳ Implement device fingerprinting for sessions
12. ⏳ Add 2FA support

---

## 🔐 Security Best Practices Implemented

✅ Passwords hashed with bcrypt (12 rounds)  
✅ Session tokens use secure random generation  
✅ Timing-safe comparison for tokens  
✅ Database queries use parameterized statements (Prisma)  
✅ Role-based access control (RBAC) implemented  
✅ Audit logging for sensitive operations  
✅ Centralized `withAuth` wrapper for consistent auth handling  
✅ Atomic transactions for critical operations (Prisma $transaction)  
✅ Race condition prevention in transaction creation  
✅ Type-safe API responses with standardized error format  
✅ Health check endpoints for container orchestration  
✅ Docker security: non-root user, minimal Alpine image  

---

## References

- CWE-285: Improper Authorization
- CWE-521: Weak Password Requirements
- CWE-770: Allocation of Resources Without Limits
- CWE-942: Overly Permissive Cross-domain Whitelist
- CWE-20: Improper Input Validation
- CWE-384: Session Fixation
- CWE-209: Information Exposure Through an Error Message
