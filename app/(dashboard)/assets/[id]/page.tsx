"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { fetchAssetById, updateAsset, deleteAsset } from "@/entities/asset/api"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import type { Database } from "@/types/supabase"
import { getHistoricalPrices, cryptoIdMap } from "@/shared/api/market-data"

type Asset = Database["public"]["Tables"]["assets"]["Row"]

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const { user, userRole } = useAuth()
  const router = useRouter()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M")

  // Form state
  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [type, setType] = useState<string>("")
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [currency, setCurrency] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch asset details
        const assetData = await fetchAssetById(params.id)
        setAsset(assetData)

        // Set form values
        setName(assetData.name)
        setSymbol(assetData.symbol)
        setType(assetData.type)
        setCurrentPrice(assetData.current_price)
        setCurrency(assetData.currency)

        // Load historical data
        loadHistoricalData(assetData.symbol, assetData.type, selectedTimeframe)
      } catch (error) {
        console.error("Error fetching asset data:", error)
        setMessage({ type: "error", text: "Failed to load asset data" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, selectedTimeframe])

  const loadHistoricalData = async (assetSymbol: string, assetType: string, timeframe: string) => {
    setIsLoadingChart(true)
    try {
      // Determine the actual symbol to use
      const actualSymbol = assetType === "crypto" ? cryptoIdMap[assetSymbol] || assetSymbol.toLowerCase() : assetSymbol
      const data = await getHistoricalPrices(actualSymbol, assetType as "stock" | "crypto", timeframe as any)
      setHistoricalData(data)
    } catch (error) {
      console.error("Error loading historical data:", error)
    } finally {
      setIsLoadingChart(false)
    }
  }

  const handleUpdateAsset = async () => {
    if (!asset) return

    setIsSaving(true)
    setMessage(null)

    try {
      const updatedAsset = await updateAsset(asset.id, {
        name,
        symbol,
        type: type as any,
        current_price: currentPrice,
        currency,
      })

      setAsset(updatedAsset)
      setMessage({ type: "success", text: "Asset updated successfully" })
    } catch (error) {
      console.error("Error updating asset:", error)
      setMessage({ type: "error", text: "Failed to update asset" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAsset = async () => {
    if (!asset) return

    if (!confirm("Are you sure you want to delete this asset?")) {
      return
    }

    try {
      await deleteAsset(asset.id)
      router.push("/assets")
    } catch (error) {
      console.error("Error deleting asset:", error)
      setMessage({ type: "error", text: "Failed to delete asset" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">Asset not found</h2>
        <p className="text-muted-foreground mb-4">
          The asset you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button asChild variant="outline">
          <a href="/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </a>
        </Button>
      </div>
    )
  }

  const isAdmin = userRole === "admin"

  return (
    <div className="space-y-6">
      <DashboardHeader heading={asset.name} text={`${asset.symbol} - ${asset.type}`}>
        <Button variant="outline" asChild>
          <a href="/assets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>
      </DashboardHeader>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Asset Details</TabsTrigger>
          <TabsTrigger value="chart">Price Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>View and update asset information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Asset Type</Label>
                <Select value={type} onValueChange={setType} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="bond">Bond</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="commodity">Commodity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Current Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Number.parseFloat(e.target.value))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={!isAdmin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last Updated</Label>
                <div className="p-2 border rounded-md bg-muted/50">{new Date(asset.updated_at).toLocaleString()}</div>
              </div>
            </CardContent>
            {isAdmin && (
              <CardFooter className="flex justify-between">
                <Button variant="destructive" onClick={handleDeleteAsset}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Asset
                </Button>
                <Button onClick={handleUpdateAsset} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>Historical price data for {asset.symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <TabsList>
                  <TabsTrigger
                    value="1M"
                    onClick={() => setSelectedTimeframe("1M")}
                    className={selectedTimeframe === "1M" ? "bg-primary text-primary-foreground" : ""}
                  >
                    1M
                  </TabsTrigger>
                  <TabsTrigger
                    value="3M"
                    onClick={() => setSelectedTimeframe("3M")}
                    className={selectedTimeframe === "3M" ? "bg-primary text-primary-foreground" : ""}
                  >
                    3M
                  </TabsTrigger>
                  <TabsTrigger
                    value="6M"
                    onClick={() => setSelectedTimeframe("6M")}
                    className={selectedTimeframe === "6M" ? "bg-primary text-primary-foreground" : ""}
                  >
                    6M
                  </TabsTrigger>
                  <TabsTrigger
                    value="1Y"
                    onClick={() => setSelectedTimeframe("1Y")}
                    className={selectedTimeframe === "1Y" ? "bg-primary text-primary-foreground" : ""}
                  >
                    1Y
                  </TabsTrigger>
                  <TabsTrigger
                    value="ALL"
                    onClick={() => setSelectedTimeframe("ALL")}
                    className={selectedTimeframe === "ALL" ? "bg-primary text-primary-foreground" : ""}
                  >
                    All
                  </TabsTrigger>
                </TabsList>
              </div>

              {isLoadingChart ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : historicalData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No historical data available for this asset.
                </div>
              ) : (
                <div>
                  <div className="h-[300px] w-full">
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                      </linearGradient>
                      {historicalData.length > 1 && (
                        <>
                          <path
                            d={`M0,${100 - ((historicalData[0].value - Math.min(...historicalData.map((d) => d.value))) / (Math.max(...historicalData.map((d) => d.value)) - Math.min(...historicalData.map((d) => d.value)))) * 80} ${historicalData.map((point, i) => `L${(i / (historicalData.length - 1)) * 100},${100 - ((point.value - Math.min(...historicalData.map((d) => d.value))) / (Math.max(...historicalData.map((d) => d.value)) - Math.min(...historicalData.map((d) => d.value)))) * 80}`).join(" ")}`}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="1.5"
                          />
                          <path
                            d={`M0,${100 - ((historicalData[0].value - Math.min(...historicalData.map((d) => d.value))) / (Math.max(...historicalData.map((d) => d.value)) - Math.min(...historicalData.map((d) => d.value)))) * 80} ${historicalData.map((point, i) => `L${(i / (historicalData.length - 1)) * 100},${100 - ((point.value - Math.min(...historicalData.map((d) => d.value))) / (Math.max(...historicalData.map((d) => d.value)) - Math.min(...historicalData.map((d) => d.value)))) * 80}`).join(" ")} L100,100 L0,100 Z`}
                            fill="url(#chart-gradient)"
                          />
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{historicalData[0]?.date ? new Date(historicalData[0].date).toLocaleDateString() : ""}</span>
                    <span>
                      {historicalData[Math.floor(historicalData.length / 2)]?.date
                        ? new Date(historicalData[Math.floor(historicalData.length / 2)].date).toLocaleDateString()
                        : ""}
                    </span>
                    <span>
                      {historicalData[historicalData.length - 1]?.date
                        ? new Date(historicalData[historicalData.length - 1].date).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Starting Price</p>
                      <p className="text-lg font-bold">
                        $
                        {historicalData[0]?.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Price</p>
                      <p className="text-lg font-bold">
                        $
                        {historicalData[historicalData.length - 1]?.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Change</p>
                      {historicalData.length > 1 && (
                        <p
                          className={`text-lg font-bold ${historicalData[historicalData.length - 1].value >= historicalData[0].value ? "text-green-500" : "text-red-500"}`}
                        >
                          {historicalData[historicalData.length - 1].value >= historicalData[0].value ? "+" : ""}
                          {(
                            ((historicalData[historicalData.length - 1].value - historicalData[0].value) /
                              historicalData[0].value) *
                            100
                          ).toFixed(2)}
                          %
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

