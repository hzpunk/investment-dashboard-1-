# System Architecture - InvestTrack

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Browser   │  │   Mobile    │  │   API Client│       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
└─────────┼────────────────┼────────────────┼──────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              Load Balancer / CDN (Nginx)                     │
│              • SSL termination                               │
│              • Rate limiting                               │
│              • Static asset caching                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Next.js)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  App Router (Server Components)                        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │ │
│  │  │  Auth   │ │  Data   │ │Analytics│ │  Admin  │      │ │
│  │  │  API    │ │  API    │ │  API    │ │  API    │      │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Layer                                      │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │   PostgreSQL    │  │     Redis       │                     │
│  │  • User data    │  │  • Sessions     │                     │
│  │  • Transactions │  │  • Cache        │                     │
│  │  • Portfolios   │  │  • Rate limits  │                     │
│  └─────────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Architecture Analysis

### Strengths ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Docker containerization | ✅ Good | Multi-stage Dockerfile |
| PostgreSQL | ✅ Good | ACID compliant |
| Prisma ORM | ✅ Good | Type-safe queries |
| Session-based auth | ✅ Good | httpOnly cookies |
| Audit logging | ✅ Good | Compliance ready |

### Bottlenecks & Issues ⚠️

| Issue | Impact | Severity |
|-------|--------|----------|
| Single instance | No horizontal scaling | HIGH |
| No caching layer | Database overload | HIGH |
| No message queue | Sync operations block | MEDIUM |
| No read replicas | Query performance | MEDIUM |
| Missing CDN | Global latency | MEDIUM |

---

## Production Architecture (Recommended)

### Phase 1: Current (Diploma Level)
```
User → Nginx → Next.js → PostgreSQL
```

### Phase 2: Production Ready
```
                    ┌─────────────┐
                    │   CDN       │
                    │  (Vercel)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
   │  Edge 1 │       │  Edge 2 │       │  Edge 3 │
   │ (Vercel)│       │ (Vercel)│       │ (Vercel)│
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────┴──────┐
                    │  API Routes │
                    │  (Serverless)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
   │ Primary │◄────►│  Read   │◄────►│  Read   │
   │   DB    │       │Replica 1│       │Replica 2│
   └─────────┘       └─────────┘       └─────────┘
        │
        ▼
   ┌─────────┐
   │  Redis  │
   │ Cluster │
   └─────────┘
```

### Phase 3: Enterprise Scale
```
┌──────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Ingress Controller                      │  │
│  │         (Nginx / Traefik / Ambassador)              │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────┼──────────────────────────────┐│
│  │         ┌─────────────┴─────────────┐                ││
│  │         │     Next.js Pods          │                ││
│  │    ┌────┴────┐  ┌────┴────┐  ┌────┴────┐          ││
│  │    │ Pod 1   │  │ Pod 2   │  │ Pod 3   │          ││
│  │    │ (API)   │  │ (API)   │  │ (API)   │          ││
│  │    └─────────┘  └─────────┘  └─────────┘          ││
│  │         │            │            │                 ││
│  │         └────────────┼────────────┘                 ││
│  │                      │                               ││
│  │         ┌────────────┴────────────┐                 ││
│  │         │    Background Workers    │                 ││
│  │    ┌────┴────┐  ┌────┴────┐  ┌────┴────┐          ││
│  │    │ Worker 1│  │ Worker 2│  │ Worker 3│          ││
│  │    │(Reports)│  │(Imports)│  │(Alerts) │          ││
│  │    └─────────┘  └─────────┘  └─────────┘          ││
│  └─────────────────────────────────────────────────────┘│
│                           │                              │
│  ┌────────────────────────┼────────────────────────────┐│
│  │         Data Layer      │                            ││
│  │  ┌─────────┐  ┌────────┴────────┐  ┌─────────┐     ││
│  │  │Primary  │  │  Read Replicas  │  │  Redis  │     ││
│  │  │   PG    │  │   (3 nodes)     │  │ Cluster │     ││
│  │  └─────────┘  └─────────────────┘  └─────────┘     ││
│  │        │                                            ││
│  │        ▼                                            ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             ││
│  │  │  Kafka  │  │S3/MinIO │  │Prometheus│             ││
│  │  │(Events) │  │(Files)  │  │(Metrics) │             ││
│  │  └─────────┘  └─────────┘  └─────────┘             ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Application Layer

**Current:** Single Next.js instance
**Recommended:** 
- Vercel Edge Functions (for auth/API)
- Static generation for landing pages
- Serverless functions for data API

```typescript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 2. Database Layer

**Current:** Single PostgreSQL instance
**Scaling Strategy:**

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  postgres-primary:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: investment_dashboard
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_primary:/var/lib/postgresql/data
    command: |
      postgres 
        -c wal_level=replica 
        -c hot_standby=on 
        -c max_wal_senders=10
    
  postgres-replica-1:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_replica1:/var/lib/postgresql/data
    command: |
      bash -c "
        pg_basebackup -h postgres-primary -D /var/lib/postgresql/data -U replicator -v -P -W &&
        echo 'standby_mode = on' > /var/lib/postgresql/data/recovery.conf &&
        echo 'primary_conninfo = \"host=postgres-primary port=5432 user=replicator\"' >> /var/lib/postgresql/data/recovery.conf &&
        postgres
      "
```

**Connection Pooling with PgBouncer:**
```
Client → PgBouncer → PostgreSQL
       (pool: 100)
```

### 3. Caching Strategy

```typescript
// lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis.Cluster([
  { host: process.env.REDIS_HOST_1, port: 6379 },
  { host: process.env.REDIS_HOST_2, port: 6379 },
])

export const cache = {
  async getAnalytics(userId: string) {
    const cached = await redis.get(`analytics:${userId}`)
    if (cached) return JSON.parse(cached)
    
    const data = await calculateAnalytics(userId)
    await redis.setex(`analytics:${userId}`, 300, JSON.stringify(data))
    return data
  },
  
  async invalidateUserCache(userId: string) {
    const keys = await redis.keys(`*:${userId}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}
```

**Cache Layers:**
| Layer | TTL | Use Case |
|-------|-----|----------|
| CDN | 1 hour | Static assets |
| Redis | 5 min | Analytics |
| Redis | 1 min | Market data |
| PostgreSQL | Permanent | Transaction data |

### 4. Message Queue (For Imports/Reports)

```typescript
// lib/queue.ts
import { Queue, Worker } from 'bullmq'

const importQueue = new Queue('import', { connection: redis })

// Producer
export async function queueImport(userId: string, file: Buffer) {
  await importQueue.add('process-csv', { userId, file }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  })
}

// Worker
const importWorker = new Worker('import', async (job) => {
  const { userId, file } = job.data
  await processImport(userId, file)
}, { connection: redis, concurrency: 5 })
```

### 5. Observability Stack

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    
  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    
  loki:
    image: grafana/loki
    
  jaeger:
    image: jaegertracing/all-in-one
```

**Key Metrics:**
```typescript
// lib/metrics.ts
import { Counter, Histogram, register } from 'prom-client'

export const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
})

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['query_type']
})
```

---

## Data Flow

### 1. User Registration Flow
```
User → Nginx → Next.js API → PostgreSQL (user + profile + role)
                                    ↓
                              Redis (session)
```

### 2. Transaction Import Flow (Async)
```
User → API → S3 (file storage)
              ↓
         Queue (BullMQ)
              ↓
         Worker → PostgreSQL
              ↓
         Notification → User
```

### 3. Real-time Analytics Flow
```
User → API → Redis Cache? 
              ↓ NO
         PostgreSQL (aggregations)
              ↓
         Redis (store for 5 min)
              ↓
         Response
```

---

## Scaling Strategy

### Horizontal Scaling

| Component | Scale Method |
|-----------|--------------|
| Next.js App | Vercel Edge / K8s pods |
| PostgreSQL | Read replicas (up to 5) |
| Redis | Cluster mode (3+ nodes) |
| Workers | Auto-scaling based on queue depth |

### Database Sharding (10M+ users)
```
Shard 1: Users A-M (PostgreSQL)
Shard 2: Users N-Z (PostgreSQL)
```

### CQRS Pattern (High Read Load)
```
Commands (Write) → Primary DB → Events → Kafka → Projections → Read DB
Queries (Read)  → Read Replica / Cache
```

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│           WAF (Cloudflare/AWS)         │
│  • DDoS protection                     │
│  • Rate limiting                       │
│  • Bot detection                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         API Gateway (Kong/AWS API GW)   │
│  • Authentication                      │
│  • Request validation                  │
│  • SSL/TLS termination                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Application (Next.js)          │
│  • RBAC authorization                  │
│  • Input sanitization                  │
│  • Audit logging                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Data Layer                       │
│  • Encrypted at rest (AES-256)           │
│  • TLS in transit                      │
│  • Row-level security                  │
└─────────────────────────────────────────┘
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Latency (p95) | < 200ms | ~500ms |
| Page Load | < 2s | ~3s |
| Concurrent Users | 10,000 | Unknown |
| Database Queries/s | 5,000 | ~500 |
| Cache Hit Rate | > 80% | 0% |

---

## Deployment Pipeline

```
Developer → Git Push → GitHub Actions
                              │
                              ▼
                    ┌─────────────────────┐
                    │      CI Stage       │
                    │  • Lint            │
                    │  • Type check      │
                    │  • Unit tests      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      CD Stage       │
                    │  • Build Docker     │
                    │  • Push registry    │
                    │  • Deploy staging   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Staging Tests     │
                    │  • Integration      │
                    │  • E2E tests       │
                    │  • Security scan   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Production Deploy  │
                    │  • Blue/Green       │
                    │  • Health checks    │
                    │  • Rollback ready   │
                    └─────────────────────┘
```

---

## Cost Estimates (Monthly)

### Phase 1 (Current)
- Server: $20 (VPS)
- Database: $15 (Managed PostgreSQL)
- **Total: ~$35/month**

### Phase 2 (Production)
- Vercel Pro: $20
- PostgreSQL (Supabase): $25
- Redis (Upstash): $10
- **Total: ~$55/month**

### Phase 3 (Enterprise)
- Kubernetes cluster: $200
- PostgreSQL cluster: $150
- Redis cluster: $50
- Monitoring: $30
- **Total: ~$430/month**

---

## Migration Path

### Step 1: Add Caching (Week 1)
```bash
# Add Redis
npm install ioredis

# Update docker-compose.yml
```

### Step 2: Add Connection Pooling (Week 2)
```bash
# Add PgBouncer to docker-compose
# Update DATABASE_URL to use pgbouncer
```

### Step 3: Setup Monitoring (Week 3)
```bash
# Add Prometheus + Grafana
# Instrument code with metrics
```

### Step 4: Background Workers (Week 4)
```bash
# Add BullMQ for async processing
# Move imports to queue
```

### Step 5: Database Replication (Week 5-6)
```bash
# Setup read replicas
# Route read queries to replicas
```

---

## Conclusion

The current architecture is **suitable for diploma/demo** but requires significant improvements for production:

**Must Have:**
1. Redis caching layer
2. Database connection pooling
3. Rate limiting
4. Monitoring & alerting

**Should Have:**
1. Read replicas
2. Message queue
3. CDN integration
4. Blue/green deployment

**Nice to Have:**
1. Kubernetes orchestration
2. CQRS pattern
3. Multi-region deployment
