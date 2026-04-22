import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

// UserRole type matching Prisma schema
export type UserRole = 'admin' | 'user' | 'premium'

const SESSION_COOKIE_NAME = 'session'

function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export async function createSession(userId: string, ttlMs: number) {
  const token = createSessionToken()
  const tokenHash = sha256Hex(token)
  const expiresAt = new Date(Date.now() + ttlMs)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export async function deleteSessionByToken(token: string) {
  const tokenHash = sha256Hex(token)
  await prisma.session.deleteMany({ where: { tokenHash } })
}

export async function getUserBySessionToken(token: string) {
  const tokenHash = sha256Hex(token)
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          profile: true,
          roles: true,
        },
      },
    },
  })

  if (!session) return null

  const role: UserRole = session.user.roles[0]?.role ?? 'user'

  return {
    id: session.user.id,
    email: session.user.email,
    username: session.user.profile?.username ?? session.user.email.split('@')[0] ?? 'User',
    role,
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME
}

export function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}
