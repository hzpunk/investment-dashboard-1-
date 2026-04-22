import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRequestUser } from '@/lib/api-auth'

export async function GET(request: Request) {
  const user = await requireRequestUser()
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam ?? '5') || 5, 1), 50)

  const txs = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: limit,
    include: {
      account: { select: { name: true } },
      asset: { select: { symbol: true, name: true } },
    },
  })

  const transactions = txs.map((t: typeof txs[0]) => {
    return {
      ...t,
      accounts: t.account,
      assets: t.asset,
    }
  })

  return NextResponse.json({ transactions })
}
