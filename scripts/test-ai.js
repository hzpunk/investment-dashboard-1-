const baseUrl = process.env.APP_BASE_URL || "http://127.0.0.1:3000"
const sessionCookie = process.env.SESSION_COOKIE || ""

async function main() {
  const response = await fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: JSON.stringify({ message: "Say hello" }),
  })

  const payload = await response.json().catch(() => null)
  if (!payload || typeof payload.ok !== "boolean") {
    throw new Error(`AI route did not return unified API response shape: HTTP ${response.status}`)
  }

  if (response.status === 401 && payload.error?.code === "UNAUTHORIZED") {
    console.log("AI route contract OK; authenticated session was not provided.")
    console.log("Set SESSION_COOKIE='session_token=...' to run an authenticated AI smoke check.")
    return
  }

  if (payload.ok) {
    if (typeof payload.data?.message !== "string" || !payload.data.message.trim()) {
      throw new Error("AI route success response is missing data.message")
    }
    console.log("AI route returned a normalized assistant response.")
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  if (!payload.error?.code) {
    throw new Error("AI route error response is missing error.code")
  }

  console.log(`AI route returned normalized error ${payload.error.code} with HTTP ${response.status}`)
  console.log(JSON.stringify(payload, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
