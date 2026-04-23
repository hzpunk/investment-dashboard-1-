"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"

interface PortfolioAllocationProps {
  className?: string
  data?: Array<{
    type: string
    value: number
  }>
  isLoading?: boolean
}

export function PortfolioAllocation({ className, data = [], isLoading = false }: PortfolioAllocationProps) {
  const { t } = useI18n()
  const [view, setView] = useState("asset-class")

  // Use provided data or fallback to default
  const allocationData =
    data.length > 0
      ? data
      : [
          { type: "stock", value: 60000 },
          { type: "bond", value: 25000 },
          { type: "etf", value: 10000 },
          { type: "crypto", value: 5000 },
        ]

  // Calculate total value and percentages
  const totalValue = allocationData.reduce((sum, item) => sum + item.value, 0)
  const allocationWithPercentage = allocationData.map((item) => ({
    ...item,
    percentage: totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0,
  }))

  // Map asset types to colors
  const typeColors: Record<string, string> = {
    stock: "bg-blue-500",
    bond: "bg-green-500",
    etf: "bg-yellow-500",
    crypto: "bg-purple-500",
    commodity: "bg-red-500",
    other: "bg-gray-500",
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{t("portfolioAllocation.title")}</CardTitle>
        <CardDescription>{t("portfolioAllocation.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-3 w-3 rounded-full mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full relative mb-6">
              {/* Donut chart */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-32 w-32 rounded-full border-8 border-transparent bg-background flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xs text-muted-foreground">{t("common.total")}</p>
                    <p className="text-lg font-bold">${totalValue.toLocaleString()}</p>
                  </div>
                </div>
                {allocationWithPercentage.map((item, index) => (
                  <div
                    key={item.type}
                    className={cn("absolute inset-0 rounded-full", typeColors[item.type] || "bg-gray-500")}
                    style={{
                      clipPath: `polygon(50% 50%, ${50 + 45 * Math.cos((index * 2 * Math.PI) / allocationWithPercentage.length - Math.PI / 2)}% ${50 + 45 * Math.sin((index * 2 * Math.PI) / allocationWithPercentage.length - Math.PI / 2)}%, ${50 + 45 * Math.cos(((index + 1) * 2 * Math.PI) / allocationWithPercentage.length - Math.PI / 2)}% ${50 + 45 * Math.sin(((index + 1) * 2 * Math.PI) / allocationWithPercentage.length - Math.PI / 2)}%)`,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {allocationWithPercentage.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={cn("h-3 w-3 rounded-full mr-2", typeColors[item.type] || "bg-gray-500")} />
                    <span className="text-sm">{getAssetTypeLabel(item.type, t)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.percentage}%</span>
                    <span className="text-xs text-muted-foreground">${item.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

