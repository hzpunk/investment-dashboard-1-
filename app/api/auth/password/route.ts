import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const user = await requireRequestUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { password } = await request.json()
    
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password update error:', error)
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }
}
