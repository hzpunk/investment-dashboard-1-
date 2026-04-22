"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react"
import {
  fetchPortfolioWithAssets,
  updatePortfolio,
  deletePortfolio,
  addAssetToPortfolio,
  removeAssetFromPortfolio,
} from "@/entities/portfolio/api"
import { fetchAssets } from "@/entities/asset/api"
import type { Database } from "@/types/supabase"

type Portfolio = Database["public"]["Tables"]["portfolios"]["Row"] & {
  assets?: Array<{
    portfolio_id: string
    asset_id: string
    quantity: number
    average_buy_price: number
    assets: Database["public"]["Tables"]["assets"]["Row"]
  }>
}

export default function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [newAsset, setNewAsset] = useState<{
    asset_id: string
    quantity: number
    average_buy_price: number
  }>({
    asset_id: "",
    quantity: 0,
    average_buy_price: 0,
  })

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Fetch portfolio details
        const portfolioData = await fetchPortfolioWithAssets(params.id)
        setPortfolio(portfolioData)

        // Set form values
        setName(portfolioData.name)
        setDescription(portfolioData.description || "")

        // Fetch available assets
        const assetsData = await fetchAssets()
        setAvailableAssets(assetsData)
      } catch (error) {
        console.error("Error fetching portfolio data:", error)
        setMessage({ type: "error", text: "Failed to load portfolio data" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, params.id])

  const handleUpdatePortfolio = async () => {
    if (!portfolio) return

    setIsSaving(true)
    setMessage(null)

    try {
      const updatedPortfolio = await updatePortfolio(portfolio.id, {
        name,
        description,
      })

      setPortfolio({
        ...portfolio,
        name: updatedPortfolio.name,
        description: updatedPortfolio.description,
      })
      setMessage({ type: "success", text: "Portfolio updated successfully" })
    } catch (error) {
      console.error("Error updating portfolio:", error)
      setMessage({ type: "error", text: "Failed to update portfolio" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePortfolio = async () => {
    if (!portfolio) return

    if (!confirm("Are you sure you want to delete this portfolio? This will also delete all associated assets.")) {
      return
    }

    try {
      await deletePortfolio(portfolio.id)
      router.push("/portfolios")
    } catch (error) {
      console.error("Error deleting portfolio:", error)
      setMessage({ type: "error", text: "Failed to delete portfolio" })
    }
  }

  const handleAddAsset = async () => {
    if (!portfolio || !newAsset.asset_id || newAsset.quantity <= 0 || newAsset.average_buy_price <= 0) {
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      await addAssetToPortfolio({
        portfolio_id: portfolio.id,
        asset_id: newAsset.asset_id,
        quantity: newAsset.quantity,
        average_buy_price: newAsset.average_buy_price,
      })

      // Refresh portfolio data
      const updatedPortfolio = await fetchPortfolioWithAssets(portfolio.id)
      setPortfolio(updatedPortfolio)

      // Reset form
      setNewAsset({
        asset_id: "",
        quantity: 0,
        average_buy_price: 0,
      })

      setIsAddAssetOpen(false)
      setMessage({ type: "success", text: "Asset added successfully" })
    } catch (error) {
      console.error("Error adding asset:", error)
      setMessage({ type: "error", text: "Failed to add asset" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveAsset = async (assetId: string) => {
    if (!portfolio) return

    if (!confirm("Are you sure you want to remove this asset from the portfolio?")) {
      return
    }

    try {
      await removeAssetFromPortfolio(portfolio.id, assetId)

      // Update local state
      setPortfolio({
        ...portfolio,
        assets: portfolio.assets?.filter((asset) => asset.asset_id !== assetId) || [],
      })

      setMessage({ type: "success", text: "Asset removed successfully" })
    } catch (error) {
      console.error("Error removing asset:", error)
      setMessage({ type: "error", text: "Failed to remove asset" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">Portfolio not found</h2>
        <p className="text-muted-foreground mb-4">
          The portfolio you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild variant="outline">
          <a href="/portfolios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Portfolios
          </a>
        </Button>
      </div>
    )
  }

  // Calculate total value and allocation
  const totalValue =
    portfolio.assets?.reduce((sum, asset) => {
      return sum + asset.quantity * asset.assets.current_price
    }, 0) || 0

  // Group assets by type for allocation
  const assetsByType =
    portfolio.assets?.reduce(
      (acc, asset) => {
        const type = asset.assets.type
        const value = asset.quantity * asset.assets.current_price

        if (!acc[type]) {
          acc[type] = { type, value: 0 }
        }

        acc[type].value += value
        return acc
      },
      {} as Record<string, { type: string; value: number }>,
    ) || {}

  const allocation = Object.values(assetsByType)

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
    <div className="space-y-6">
      <DashboardHeader heading={portfolio.name} text={portfolio.description || "Manage your investment portfolio"}>
        <Button variant="outline" asChild>
          <a href="/portfolios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>
      </DashboardHeader>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Portfolio Assets</CardTitle>
                <CardDescription>Manage assets in your portfolio</CardDescription>
              </div>
              <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Asset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Asset to Portfolio</DialogTitle>
                    <DialogDescription>Add an investment asset to your portfolio.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="asset" className="text-right">
                        Asset
                      </Label>
                      <Select
                        value={newAsset.asset_id}
                        onValueChange={(value) => setNewAsset({ ...newAsset, asset_id: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAssets.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.symbol} - {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="quantity" className="text-right">
                        Quantity
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={newAsset.quantity || ""}
                        onChange={(e) => setNewAsset({ ...newAsset, quantity: Number.parseFloat(e.target.value) })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="price" className="text-right">
                        Average Buy Price
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={newAsset.average_buy_price || ""}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, average_buy_price: Number.parseFloat(e.target.value) })
                        }
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddAsset} disabled={isSaving}>
                      {isSaving ? "Adding..." : "Add Asset"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Avg. Buy Price</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.assets && portfolio.assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          No assets in this portfolio. Add your first asset to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      portfolio.assets?.map((asset) => {
                        const currentValue = asset.quantity * asset.assets.current_price
                        const costBasis = asset.quantity * asset.average_buy_price
                        const gainLoss = currentValue - costBasis
                        const gainLossPercent = (gainLoss / costBasis) * 100

                        return (
                          <TableRow key={asset.asset_id}>
                            <TableCell className="font-medium">{asset.assets.symbol}</TableCell>
                            <TableCell>{asset.assets.name}</TableCell>
                            <TableCell className="capitalize">{asset.assets.type}</TableCell>
                            <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              $
                              {asset.average_buy_price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              $
                              {asset.assets.current_price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              $
                              {currentValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className={`text-right ${gainLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {gainLoss >= 0 ? "+" : ""}$
                              {gainLoss.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              ({gainLoss >= 0 ? "+" : ""}
                              {gainLossPercent.toFixed(2)}%)
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveAsset(asset.asset_id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-xl font-bold">{portfolio.assets?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold">
                    ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
              <CardDescription>How your investments are distributed</CardDescription>
            </CardHeader>
            <CardContent>
              {allocation.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assets in this portfolio. Add assets to see allocation.
                </div>
              ) : (
                <>
                  <div className="h-[200px] w-full relative mb-6">
                    {/* Donut chart */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-32 w-32 rounded-full border-8 border-transparent bg-background flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">${totalValue.toLocaleString()}</p>
                        </div>
                      </div>
                      {allocation.map((item, index) => (
                        <div
                          key={item.type}
                          className={`absolute inset-0 rounded-full ${typeColors[item.type] || "bg-gray-500"}`}
                          style={{
                            clipPath: `polygon(50% 50%, ${50 + 45 * Math.cos((index * 2 * Math.PI) / allocation.length - Math.PI / 2)}% ${50 + 45 * Math.sin((index * 2 * Math.PI) / allocation.length - Math.PI / 2)}%, ${50 + 45 * Math.cos(((index + 1) * 2 * Math.PI) / allocation.length - Math.PI / 2)}% ${50 + 45 * Math.sin(((index + 1) * 2 * Math.PI) / allocation.length - Math.PI / 2)}%)`,
                            opacity: 0.8,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    {allocation.map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-2 ${typeColors[item.type] || "bg-gray-500"}`} />
                          <span className="text-sm capitalize">{item.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0}%
                          </span>
                          <span className="text-xs text-muted-foreground">${item.value.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Settings</CardTitle>
              <CardDescription>Update your portfolio information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Portfolio Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Created At</Label>
                <div className="p-2 border rounded-md bg-muted/50">
                  {new Date(portfolio.created_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive" onClick={handleDeletePortfolio}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Portfolio
              </Button>
              <Button onClick={handleUpdatePortfolio} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

