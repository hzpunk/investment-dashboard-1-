import { cookies } from 'next/headers'
import { getSessionCookieName, getUserBySessionToken } from '@/lib/auth'

export async function getRequestUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value
  if (!token) return null
  return getUserBySessionToken(token)
}

export async function requireRequestUser() {
  const user = await getRequestUser()
  if (!user) {
    const err = new Error('Unauthorized')
    ;(err as any).status = 401
    throw err
  }
  return user
}
