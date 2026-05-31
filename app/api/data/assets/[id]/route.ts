import { Prisma } from '@prisma/client'
import { invalidateAllUsersDerivedFinancialCache, invalidateMarketCache } from '@/lib/cache-invalidation'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { supportedAssetCurrencies, type AssetTypeValue } from '@/shared/config/asset-presets'

const assetTypes: AssetTypeValue[] = ['stock', 'bond', 'etf', 'crypto', 'commodity', 'other']
const supportedCurrencies = new Set<string>(supportedAssetCurrencies)
const tickerPattern = /^[A-Z0-9._-]{1,15}$/

type AssetPayload = {
  symbol?: unknown
  name?: unknown
  type?: unknown
  currentPrice?: unknown
  currency?: unknown
}

function normalizeAssetPayload(data: AssetPayload) {
  const symbol = String(data.symbol ?? '').trim().toUpperCase()
  const name = String(data.name ?? '').trim()
  const type = String(data.type ?? '').trim()
  const currency = String(data.currency ?? '').trim().toUpperCase()
  const currentPrice = Number(data.currentPrice)

  if (!symbol) return { error: 'Ticker is required', code: 'TICKER_REQUIRED' } as const
  if (!tickerPattern.test(symbol)) return { error: 'Ticker must be 1-15 uppercase letters, numbers, dots, dashes, or underscores', code: 'TICKER_INVALID' } as const
  if (!name) return { error: 'Name is required', code: 'NAME_REQUIRED' } as const
  if (!assetTypes.includes(type as AssetTypeValue)) return { error: 'Invalid asset type', code: 'TYPE_INVALID' } as const
  if (!Number.isFinite(currentPrice) || currentPrice < 0) return { error: 'Price must be a valid non-negative number', code: 'PRICE_INVALID' } as const
  if (!supportedCurrencies.has(currency)) return { error: 'Invalid currency', code: 'CURRENCY_INVALID' } as const

  return {
    data: {
      symbol,
      name,
      type: type as AssetTypeValue,
      currentPrice,
      currency,
    },
  } as const
}

function isDuplicateSymbolError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export const GET = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string

  if (!id) {
    return errorResponse('ID required', 400)
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
  })

  if (!asset) {
    return errorResponse('Asset not found', 404)
  }

  return successResponse({
    asset: {
      ...asset,
      updatedAt: asset.updatedAt.toISOString(),
    },
  })
})

export const PUT = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return errorResponse('Invalid JSON body', 400, 'INVALID_JSON')
  }

  const normalized = normalizeAssetPayload(body)
  if ('error' in normalized) {
    return errorResponse(normalized.error ?? 'Invalid asset', 400, normalized.code)
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
  })

  if (!asset) {
    return errorResponse('Asset not found', 404)
  }

  let updatedAsset
  try {
    updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        ...normalized.data,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    if (isDuplicateSymbolError(error)) {
      return errorResponse('An asset with this ticker already exists', 409, 'DUPLICATE_SYMBOL')
    }
    throw error
  }

  const formattedAsset = {
    ...updatedAsset,
    updatedAt: updatedAsset.updatedAt.toISOString(),
  }

  await Promise.all([
    invalidateMarketCache(asset.symbol),
    asset.symbol === updatedAsset.symbol ? Promise.resolve() : invalidateMarketCache(updatedAsset.symbol),
    invalidateAllUsersDerivedFinancialCache(),
  ])

  return successResponse({ asset: formattedAsset })
})

export const DELETE = withAuth(async (request, user, ctx) => {
  const params = await ctx?.params
  const id = params?.id as string
  
  if (!id) {
    return errorResponse('ID required', 400)
  }

  const asset = await prisma.asset.findUnique({
    where: { id },
  })

  if (!asset) {
    return errorResponse('Asset not found', 404)
  }

  try {
    await prisma.asset.delete({ where: { id } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return errorResponse('Asset is used by existing records and cannot be deleted', 409, 'ASSET_IN_USE')
    }
    throw error
  }
  await Promise.all([invalidateMarketCache(asset.symbol), invalidateAllUsersDerivedFinancialCache()])
  return successResponse({ success: true })
})
