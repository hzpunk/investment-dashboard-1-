"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Pencil, Trash2, BarChart3 } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { fetchPortfolios, createPortfolio, deletePortfolio, Portfolio } from "@/entities/portfolio/api"

type PortfolioWithDetails = Portfolio & {
  _count?: { assets: number }
  _value?: number
}

export default function PortfoliosPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [portfolios, setPortfolios] = useState<PortfolioWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newPortfolio, setNewPortfolio] = useState<Partial<Portfolio>>({})

  useEffect(() => {
    const loadPortfolios = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        const data = await fetchPortfolios()
        // Calculate asset counts and values from portfolio data
        const portfoliosWithDetails = (data || []).map((portfolio: Portfolio & { assets?: any[] }) => {
          const assets = portfolio.assets || []
          const assetCount = assets.length
          const totalValue = assets.reduce((sum: number, item: any) => {
            return sum + (item.quantity || 0) * (item.asset?.currentPrice || 0)
          }, 0)

          return {
            ...portfolio,
            _count: { assets: assetCount },
            _value: totalValue,
          }
        })
        setPortfolios(portfoliosWithDetails)
      } catch (error) {
        console.error("Error fetching portfolios:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPortfolios()
  }, [user])

  // Handle add portfolio using API
  const handleAddPortfolio = async () => {
    if (!user || !newPortfolio.name) {
      return
    }

    setIsSubmitting(true)

    try {
      const createdPortfolio = await createPortfolio({
        name: newPortfolio.name,
        description: newPortfolio.description || null,
      })

      if (!createdPortfolio) {
        console.error("Failed to create portfolio")
        return
      }

      setPortfolios([...portfolios, createdPortfolio as PortfolioWithDetails])
      setNewPortfolio({})
    } catch (error) {
      console.error("Error creating portfolio:", error)
    } finally {
      setIsSubmitting(false)
      setIsAddPortfolioOpen(false)
    }
  }

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm(t("portfolios.confirmDelete"))) {
      return
    }

    try {
      await deletePortfolio(id)
      setPortfolios(portfolios.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Error deleting portfolio:", error)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("portfolios.title")} text={t("portfolios.description")}>
        <Dialog open={isAddPortfolioOpen} onOpenChange={setIsAddPortfolioOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.addPortfolio")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("portfolios.addDialogTitle")}</DialogTitle>
              <DialogDescription>{t("portfolios.addDialogDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {t("common.name")}
                </Label>
                <Input
                  id="name"
                  value={newPortfolio.name || ""}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  {t("common.description")}
                </Label>
                <Textarea
                  id="description"
                  value={newPortfolio.description || ""}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPortfolioOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddPortfolio} disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("actions.createPortfolio")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-8 w-3/4" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-8 w-1/3" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-3">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">{t("empty.portfolios")}</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {t("portfolios.noPortfolios")}
                </p>
                <Button className="mt-4" onClick={() => setIsAddPortfolioOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("actions.addPortfolio")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            portfolios.map((portfolio) => (
              <Card key={portfolio.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{portfolio.name}</CardTitle>
                  {portfolio.description && <CardDescription>{portfolio.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("portfolios.totalValue")}</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        $
                        {portfolio._value?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("portfolios.assets")}</p>
                      <p className="text-xl sm:text-2xl font-bold">{portfolio._count?.assets}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between mt-auto">
                  <Button variant="outline" asChild className="w-full sm:w-auto">
                    <a href={`/portfolios/${portfolio.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("actions.manage")}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeletePortfolio(portfolio.id)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete")}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

