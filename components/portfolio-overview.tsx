"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/contexts/i18n-context"

interface PortfolioOverviewProps {
  className?: string
  totalValue: number
  portfolioChange?: number
  portfolioChangePercent?: number
  ytdReturn?: number
  allTimeReturn?: number
}

export function PortfolioOverview({
  className,
  totalValue,
  portfolioChange = 1243.45,
  portfolioChangePercent = 1.2,
  ytdReturn = 8.2,
  allTimeReturn = 12.5,
}: PortfolioOverviewProps) {
  const { t } = useI18n()
  const isPositive = portfolioChange >= 0

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>{t("portfolioOverview.title")}</CardTitle>
        <CardDescription>{t("portfolioOverview.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-medium leading-none">{t("portfolioOverview.totalValue")}</h3>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-2xl sm:text-3xl font-bold">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div
                className={cn("flex items-center text-sm mt-1 sm:mt-0", isPositive ? "text-green-500" : "text-red-500")}
              >
                {isPositive ? <ArrowUpRight className="mr-1 h-4 w-4" /> : <ArrowDownRight className="mr-1 h-4 w-4" />}
                <span>
                  $
                  {Math.abs(portfolioChange).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ml-1">({portfolioChangePercent}%)</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium leading-none">{t("portfolioOverview.ytdReturn")}</h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-500">+{ytdReturn}%</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium leading-none">{t("portfolioOverview.allTime")}</h3>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-500">+{allTimeReturn}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

