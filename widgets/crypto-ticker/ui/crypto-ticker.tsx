"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getCryptoPrices, cryptoIdMap } from "@/shared/api/market-data"
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

export function CryptoTicker() {
  const { t } = useI18n()
  const [prices, setPrices] = useState<CryptoPrice[]>(
    popularCryptos.map((crypto) => ({
      ...crypto,
      price: 0,
      change24h: 0,
    })),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const geckoIds = popularCryptos.map((p) => cryptoIdMap[p.symbol]).filter(Boolean)
        const data = await getCryptoPrices(geckoIds)

        if (!data || Object.keys(data).length === 0) {
          throw new Error("failed_to_fetch_crypto_prices")
        }

        const updatedPrices = popularCryptos.map((coin) => {
          const geckoId = cryptoIdMap[coin.symbol]
          const coinData = data[geckoId]

          return {
            ...coin,
            price: coinData?.usd || 0,
            change24h: coinData?.usd_24h_change || 0,
          }
        })

        setPrices(updatedPrices)
      } catch (err) {
        console.error("Error fetching crypto prices:", err)
        setError(t("errors.unavailable"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [t])

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
          ) : error ? (
            <div className="py-4 text-center text-muted-foreground">{error}</div>
          ) : (
            prices.map((coin) => (
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
                      {coin.change24h >= 0 ? "↑" : "↓"} {Math.abs(coin.change24h).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

