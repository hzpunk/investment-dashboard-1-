type RequestLike = {
  headers?: Headers | Record<string, string | string[] | undefined>
}

export function getPublicAppUrl(request?: RequestLike): string {
  const explicit = normalizeUrl(process.env.APP_PUBLIC_URL) ?? normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
  if (explicit) return explicit

  const headers = request?.headers
  const forwardedProto = getHeader(headers, "x-forwarded-proto")
  const forwardedHost = getHeader(headers, "x-forwarded-host")
  const host = forwardedHost ?? getHeader(headers, "host")

  if (host) {
    const proto = forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")
    return normalizeUrl(`${proto}://${host}`) ?? "http://localhost:3000"
  }

  return "http://localhost:3000"
}

function getHeader(headers: RequestLike["headers"], key: string) {
  if (!headers) return null
  if (headers instanceof Headers) return normalizeHeader(headers.get(key))

  const direct = headers[key] ?? headers[key.toLowerCase()]
  if (Array.isArray(direct)) return normalizeHeader(direct[0])
  return normalizeHeader(direct)
}

function normalizeHeader(value: string | undefined | null) {
  if (!value) return null
  const first = value.split(",")[0]?.trim()
  return first || null
}

function normalizeUrl(value: string | undefined | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}
