import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRequestUser } from '@/lib/api-auth'

export async function GET() {
  const user = await requireRequestUser()
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ accounts })
}
