const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3000"

async function main() {
  const response = await fetch(`${baseUrl}/api/health`)
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.ok) {
    throw new Error(`Health check failed: HTTP ${response.status} ${JSON.stringify(payload)}`)
  }

  console.log(`Health endpoint OK at ${baseUrl}`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
