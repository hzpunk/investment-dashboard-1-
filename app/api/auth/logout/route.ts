import { NextResponse } from 'next/server'
import { deleteSessionByToken, getSessionCookieName } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(getSessionCookieName())?.value

  if (token) {
    await deleteSessionByToken(token)
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  })

  return res
}
