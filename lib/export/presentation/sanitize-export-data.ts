const internalKeyPattern = /(^id$|id$|^key$|userId|assetId|portfolioId|accountId|qrCode|chartSnapshots|password|token|secret|cookie|session|databaseUrl)/i
const internalIdPattern = /\b(?:c[a-z0-9]{20,}|[0-9a-f]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i

export function sanitizeExportData<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => sanitizeExportData(item)) as T
  if (!value || typeof value !== "object") return sanitizeScalar(value) as T

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !internalKeyPattern.test(key))
      .map(([key, nested]) => [key, sanitizeExportData(nested)]),
  ) as T
}

export function containsInternalExportLeak(value: unknown) {
  return internalIdPattern.test(JSON.stringify(value))
}

function sanitizeScalar(value: unknown) {
  if (typeof value !== "string") return value
  return internalIdPattern.test(value) ? "" : value
}
