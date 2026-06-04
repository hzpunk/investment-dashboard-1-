const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3000"

async function readJson(response) {
  return response.json().catch(() => null)
}

function assertUnifiedResponse(payload, label) {
  if (!payload || typeof payload.ok !== "boolean") {
    throw new Error(`${label} did not return unified API response shape`)
  }

  if (payload.ok && !("data" in payload)) {
    throw new Error(`${label} success response is missing data`)
  }

  if (!payload.ok && (!payload.error || typeof payload.error.code !== "string")) {
    throw new Error(`${label} error response is missing error.code`)
  }
}

async function main() {
  const health = await fetch(`${baseUrl}/api/health`)
  const healthPayload = await readJson(health)
  assertUnifiedResponse(healthPayload, "GET /api/health")

  const protectedResponse = await fetch(`${baseUrl}/api/data/accounts`)
  const protectedPayload = await readJson(protectedResponse)
  assertUnifiedResponse(protectedPayload, "GET /api/data/accounts")

  if (protectedResponse.status !== 401 || protectedPayload.error?.code !== "UNAUTHORIZED") {
    throw new Error(`Expected protected endpoint to return 401 UNAUTHORIZED, got ${protectedResponse.status}`)
  }

  console.log(`API contract smoke checks passed at ${baseUrl}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
