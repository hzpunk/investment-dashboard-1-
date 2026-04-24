// Validation utilities for input sanitization and limits

// Input length limits to prevent DoS attacks
export const LIMITS = {
  EMAIL_MAX: 254,
  USERNAME_MAX: 50,
  PASSWORD_MAX: 128,
  PASSWORD_MIN: 6,
  MESSAGE_MAX: 10000, // AI chat message
  JSON_MAX_SIZE: 1024 * 1024, // 1MB max JSON body
  HISTORY_MAX_ITEMS: 50, // AI chat history
}

// Validate string length
export function validateLength(value: string, max: number, min = 1): boolean {
  return value.length >= min && value.length <= max
}

// Sanitize string to prevent XSS
export function sanitizeString(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;')
}

// Validate email format
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= LIMITS.EMAIL_MAX
}

// Validate username (alphanumeric + underscore, no HTML)
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_\-]+$/
  return usernameRegex.test(username) && 
    username.length <= LIMITS.USERNAME_MAX &&
    username.length >= 2
}

// Parse JSON safely with size limit
export async function safeJsonParse(request: Request): Promise<unknown> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > LIMITS.JSON_MAX_SIZE) {
    throw new Error('Request body too large')
  }

  try {
    const body = await request.json()
    return body
  } catch {
    throw new Error('Invalid JSON')
  }
}

// Validate AI message
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' }
  }
  
  if (message.length > LIMITS.MESSAGE_MAX) {
    return { valid: false, error: `Message too long (max ${LIMITS.MESSAGE_MAX} chars)` }
  }
  
  if (message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' }
  }
  
  return { valid: true }
}

// Validate history array
export function validateHistory(history: unknown[]): { valid: boolean; error?: string } {
  if (!Array.isArray(history)) {
    return { valid: false, error: 'History must be an array' }
  }
  
  if (history.length > LIMITS.HISTORY_MAX_ITEMS) {
    return { valid: false, error: `History too long (max ${LIMITS.HISTORY_MAX_ITEMS} items)` }
  }
  
  return { valid: true }
}

// Validate and sanitize symbol for SQL injection prevention
export function validateSymbol(symbol: string): boolean {
  return /^[A-Z0-9.-]{1,20}$/i.test(symbol)
}

export function sanitizeSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') return ''
  return symbol.toUpperCase().replace(/[^A-Z0-9.-]/g, '').substring(0, 20)
}

// Validate UUID format
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
