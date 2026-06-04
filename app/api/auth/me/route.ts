import { cookies } from 'next/headers'
import { getSessionCookieName, getUserBySessionToken } from '@/lib/auth'
import { apiSuccess } from '@/lib/api-response'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value

  if (!token) {
    return apiSuccess({ user: null })
  }

  const user = await getUserBySessionToken(token)
  return apiSuccess({ user })
}
