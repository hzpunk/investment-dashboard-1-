import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionCookieName, getUserBySessionToken } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  const user = await getUserBySessionToken(token)
  return NextResponse.json({ user }, { status: 200 })
}
