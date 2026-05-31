import { Prisma } from '@prisma/client'
import { cacheKeys } from '@/lib/cache-keys'
import { invalidateMarketCache } from '@/lib/cache-invalidation'
import { withAuth, successResponse, errorResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/prisma'
import { cached } from '@/lib/server-cache'
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
  const type = String(data.type ?? 'stock').trim()
  const currency = String(data.currency ?? 'USD').trim().toUpperCase()
  const currentPrice = Number(data.currentPrice ?? 0)

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

export const GET = withAuth(async () => {
  const formattedAssets = await cached({
    key: cacheKeys.assetsList(),
    ttlSeconds: 1800,
    label: 'assets-list',
    fetcher: async () => {
      const assets = await prisma.asset.findMany({
        orderBy: { symbol: 'asc' },
      })

      return assets.map((asset) => ({
        ...asset,
        updatedAt: asset.updatedAt.toISOString(),
      }))
    },
  })

  return successResponse({ assets: formattedAssets })
})

export const POST = withAuth(async (request) => {
  const body = await request.json().catch(() => null)
  if (!body) {
    return errorResponse('Invalid JSON body', 400, 'INVALID_JSON')
  }

  const normalized = normalizeAssetPayload(body)
  if ('error' in normalized) {
    return errorResponse(normalized.error ?? 'Invalid asset', 400, normalized.code)
  }

  let asset
  try {
    asset = await prisma.asset.create({
      data: normalized.data,
    })
  } catch (error) {
    if (isDuplicateSymbolError(error)) {
      return errorResponse('An asset with this ticker already exists', 409, 'DUPLICATE_SYMBOL')
    }
    throw error
  }

  const formattedAsset = {
    ...asset,
    updatedAt: asset.updatedAt.toISOString(),
  }

  await invalidateMarketCache(formattedAsset.symbol)
  return successResponse({ asset: formattedAsset })
})
