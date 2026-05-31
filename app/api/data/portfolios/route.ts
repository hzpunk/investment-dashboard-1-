import { NextRequest, NextResponse } from 'next/server'
import { cacheKeys } from '@/lib/cache-keys'
import { invalidateUserPortfolioCache } from '@/lib/cache-invalidation'
import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { cached } from '@/lib/server-cache'

export const GET = withAuth(async (_, user) => {
  const formattedPortfolios = await cached({
    key: cacheKeys.userPortfolios(user.id),
    ttlSeconds: 120,
    label: `portfolios user=${user.id}`,
    fetcher: async () => {
      const portfolios = await prisma.portfolio.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          userId: true,
          name: true,
          description: true,
          createdAt: true,
          assets: {
            select: {
              portfolioId: true,
              assetId: true,
              quantity: true,
              averageBuyPrice: true,
              asset: {
                select: {
                  id: true,
                  symbol: true,
                  name: true,
                  type: true,
                  currentPrice: true,
                  currency: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return portfolios.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        assets: p.assets.map((item) => ({
          ...item,
          asset: {
            ...item.asset,
            updatedAt: item.asset.updatedAt.toISOString(),
          },
        })),
      }))
    },
  })
  return successResponse({ portfolios: formattedPortfolios })
})

export const POST = withAuth(async (request: NextRequest, user): Promise<any> => {
  try {
    const body = await request.json()
    const { name, description, strategy } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        description: description || null,
        userId: user.id,
      },
    })

    await invalidateUserPortfolioCache(user.id, portfolio.id)
    return successResponse({ portfolio: { ...portfolio, createdAt: portfolio.createdAt.toISOString() } }, 201)
  } catch (error) {
    console.error('Error creating portfolio:', error)
    return errorResponse('Failed to create portfolio', 500)
  }
})
