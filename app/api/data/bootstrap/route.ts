import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRequestUser } from '@/lib/api-auth'

export async function POST() {
  const user = await requireRequestUser()

  const existing = await prisma.account.findFirst({ where: { userId: user.id } })
  if (existing) {
    return NextResponse.json({ ok: true })
  }

  const [account, asset] = await prisma.$transaction([
    prisma.account.create({
      data: {
        userId: user.id,
        name: 'Main Account',
        type: 'brokerage',
        balance: 10000,
        currency: 'USD',
      },
    }),
    prisma.asset.upsert({
      where: { symbol: 'AAPL' },
      update: { currentPrice: 175, updatedAt: new Date(), currency: 'USD', name: 'Apple Inc.', type: 'stock' },
      create: { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', currentPrice: 175, currency: 'USD' },
    }),
  ])

  await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: account.id,
      assetId: asset.id,
      type: 'buy',
      quantity: 5,
      pricePerUnit: 175,
      totalAmount: 875,
      fee: 1,
      currency: 'USD',
      date: new Date(),
      notes: 'Seed transaction',
    },
  })

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: 'Emergency Fund',
      targetAmount: 20000,
      currentAmount: 5000,
    },
  })

  const portfolio = await prisma.portfolio.create({
    data: {
      userId: user.id,
      name: 'Main Portfolio',
      description: 'Auto-generated portfolio',
    },
  })

  await prisma.portfolioAsset.create({
    data: {
      portfolioId: portfolio.id,
      assetId: asset.id,
      quantity: 5,
      averageBuyPrice: 175,
    },
  })

  return NextResponse.json({ ok: true })
}
