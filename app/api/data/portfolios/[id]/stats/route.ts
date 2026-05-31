import { prisma } from '@/lib/prisma'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { getPortfolioSummary } from '@/lib/services/portfolio-summary'

export const GET = withAuth(async (_request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string

  if (!id) {
    return errorResponse('Portfolio ID required', 400)
  }

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
    return errorResponse('Portfolio not found', 404)
  }

  const summary = await getPortfolioSummary(user.id)

  return successResponse({
    totalValue: summary.totalValue,
    assetCount: summary.holdings.length,
    allocation: summary.allocation,
    holdings: summary.holdings,
    source: summary.source,
  })
})
