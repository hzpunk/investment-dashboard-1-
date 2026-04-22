"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
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
import type { Database } from "@/types/supabase"

type Portfolio = Database["public"]["Tables"]["portfolios"]["Row"] & {
  _count?: {
    assets: number
  }
  _value?: number
}

export default function PortfoliosPage() {
  const { user } = useAuth()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddPortfolioOpen, setIsAddPortfolioOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newPortfolio, setNewPortfolio] = useState<Partial<Portfolio>>({})

  useEffect(() => {
    const fetchPortfolios = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch portfolios
        const { data, error } = await supabase
          .from("portfolios")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) throw error

        // For each portfolio, fetch asset count and total value
        const portfoliosWithDetails = await Promise.all(
          (data || []).map(async (portfolio) => {
            // Get portfolio assets
            const { data: portfolioAssets, error: assetsError } = await supabase
              .from("portfolio_assets")
              .select(`
              asset_id,
              quantity,
              average_buy_price,
              assets(current_price, currency)
            `)
              .eq("portfolio_id", portfolio.id)

            if (assetsError) throw assetsError

            // Calculate total value and count
            const assetCount = portfolioAssets?.length || 0
            const totalValue =
              portfolioAssets?.reduce((sum, item) => {
                return sum + item.quantity * (item.assets?.current_price || 0)
              }, 0) || 0

            return {
              ...portfolio,
              _count: {
                assets: assetCount,
              },
              _value: totalValue,
            }
          }),
        )

        setPortfolios(portfoliosWithDetails)
      } catch (error) {
        console.error("Error fetching portfolios:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPortfolios()
  }, [user])

  // Update the handleAddPortfolio function to ensure we're using the correct user ID
  const handleAddPortfolio = async () => {
    if (!user || !newPortfolio.name) {
      return
    }

    setIsSubmitting(true)

    try {
      // Make sure we're using the correct user ID from the auth context
      const userId = user.id

      // Log the user ID for debugging
      console.log("Creating portfolio with user ID:", userId)

      const { error } = await supabase.from("portfolios").insert({
        user_id: userId,
        name: newPortfolio.name,
        description: newPortfolio.description || null,
      })

      if (error) {
        console.error("Portfolio creation error:", error)
        throw error
      }

      // Refresh the page to show the new portfolio
      window.location.reload()
    } catch (error) {
      console.error("Error adding portfolio:", error)
    } finally {
      setIsSubmitting(false)
      setIsAddPortfolioOpen(false)
    }
  }

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio? This will also delete all associated assets.")) {
      return
    }

    try {
      const { error } = await supabase.from("portfolios").delete().eq("id", id)

      if (error) throw error

      // Update the portfolios list
      setPortfolios(portfolios.filter((portfolio) => portfolio.id !== id))
    } catch (error) {
      console.error("Error deleting portfolio:", error)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading="Portfolios" text="Manage your investment portfolios.">
        <Dialog open={isAddPortfolioOpen} onOpenChange={setIsAddPortfolioOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>Create a new portfolio to group your investments.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
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
                  Description
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
                Cancel
              </Button>
              <Button onClick={handleAddPortfolio} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Portfolio"}
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
                <h3 className="mt-4 text-lg font-medium">No portfolios found</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Create your first portfolio to start tracking your investments.
                </p>
                <Button className="mt-4" onClick={() => setIsAddPortfolioOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Portfolio
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
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        $
                        {portfolio._value?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Assets</p>
                      <p className="text-xl sm:text-2xl font-bold">{portfolio._count?.assets}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between mt-auto">
                  <Button variant="outline" asChild className="w-full sm:w-auto">
                    <a href={`/portfolios/${portfolio.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Manage
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeletePortfolio(portfolio.id)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
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

