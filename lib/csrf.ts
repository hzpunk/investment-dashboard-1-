// CSRF Protection utilities
import { randomBytes, timingSafeEqual } from 'crypto'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url')
}

export function validateCsrfToken(token: string, cookieToken: string): boolean {
  if (!token || !cookieToken) return false
  try {
    const tokenBuf = Buffer.from(token, 'base64url')
    const cookieBuf = Buffer.from(cookieToken, 'base64url')
    if (tokenBuf.length !== cookieBuf.length) return false
    return timingSafeEqual(tokenBuf, cookieBuf)
  } catch {
    return false
  }
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME }
