const Redis = require("ioredis")

const url = process.env.REDIS_URL || "redis://127.0.0.1:6379"
const redis = new Redis(url, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 1000,
  commandTimeout: 1000,
})

async function main() {
  try {
    await redis.connect()
    const result = await redis.ping()
    console.log(`Redis ${url}: ${result}`)
  } finally {
    redis.disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
