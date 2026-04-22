import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRequestUser } from '@/lib/api-auth'

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireRequestUser()
  const { id } = await ctx.params

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: {
      assets: {
        include: {
          asset: true,
        },
      },
    },
  })

  if (!portfolio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let totalValue = 0
  const assetsByType: Record<string, { type: string; value: number }> = {}

  for (const item of portfolio.assets) {
    const asset = item.asset
    const value = item.quantity * asset.currentPrice
    totalValue += value

    if (!assetsByType[asset.type]) {
      assetsByType[asset.type] = { type: asset.type, value: 0 }
    }
    assetsByType[asset.type].value += value
  }

  return NextResponse.json({
    totalValue,
    assetCount: portfolio.assets.length,
    allocation: Object.values(assetsByType),
  })
}
