"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getCryptoPricesResult, cryptoIdMap } from "@/shared/api/market-data"
import { useI18n } from "@/contexts/i18n-context"

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
}

const popularCryptos = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "Binance Coin" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "Ripple" },
]

const defaultPrices = popularCryptos.map((crypto) => ({
  ...crypto,
  price: 0,
  change24h: 0,
}))

export function CryptoTicker() {
  const { t } = useI18n()
  const geckoIds = useMemo(() => popularCryptos.map((p) => cryptoIdMap[p.symbol]).filter(Boolean), [])

  const pricesResult = useQuery({
    queryKey: ["crypto-ticker", geckoIds],
    queryFn: () => getCryptoPricesResult(geckoIds),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const prices: CryptoPrice[] = useMemo(() => {
    const data = pricesResult.data?.data ?? {}
    if (!pricesResult.data) return defaultPrices

    return popularCryptos.map((coin) => {
      const geckoId = cryptoIdMap[coin.symbol]
      const coinData = data[geckoId]

      return {
        ...coin,
        price: coinData?.usd || 0,
        change24h: coinData?.usd_24h_change || 0,
      }
    })
  }, [pricesResult.data])

  const isLoading = pricesResult.isLoading && !pricesResult.data
  const warning = pricesResult.data?.source === "fallback" || pricesResult.isError ? t("errors.unavailable") : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.cryptoTicker")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                  </div>
                </div>
              ))
          ) : (
            <>
              {warning ? <div className="pb-2 text-xs text-muted-foreground">{warning}</div> : null}
              {prices.map((coin) => (
                <div key={coin.symbol} className="py-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        {coin.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{coin.symbol}</div>
                        <div className="text-sm text-muted-foreground">{coin.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-sm ${coin.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {coin.change24h >= 0 ? "up" : "down"} {Math.abs(coin.change24h).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
