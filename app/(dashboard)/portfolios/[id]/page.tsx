"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  updatePortfolio,
  deletePortfolio,
  addAssetToPortfolio,
  removeAssetFromPortfolio,
} from "@/entities/portfolio/api"
import { type Asset } from "@/entities/asset/api"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"
import { assetsQuery, portfolioQuery, queryKeys } from "@/lib/query-options"

type PortfolioAsset = {
  portfolioId: string
  assetId: string
  quantity: number
  averageBuyPrice: number
  asset: Asset
}

type Portfolio = {
  id: string
  userId: string
  name: string
  description: string | null
  createdAt: string
  assets: PortfolioAsset[]
}

export default function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [newAsset, setNewAsset] = useState<{
    assetId: string
    quantity: number
    averageBuyPrice: number
  }>({
    assetId: "",
    quantity: 0,
    averageBuyPrice: 0,
  })

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const userId = user?.id ?? ""
  const enabled = Boolean(user)
  const portfolioResult = useQuery({ ...portfolioQuery(userId, id), enabled })
  const assetsResult = useQuery({ ...assetsQuery(), enabled })
  const portfolio = portfolioResult.data as unknown as Portfolio | null
  const availableAssets = assetsResult.data ?? []

  useEffect(() => {
    if (!portfolio) return
    setName(portfolio.name)
    setDescription(portfolio.description || "")
  }, [portfolio?.id])

  const invalidatePortfolioData = () => {
    if (!user) return
    void queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(user.id, id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.portfolios(user.id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(user.id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics(user.id) })
  }

  const updatePortfolioMutation = useMutation({
    mutationFn: () => updatePortfolio(id, { name, description }),
    onSuccess: (updatedPortfolio) => {
      if (!updatedPortfolio || !user) return
      queryClient.setQueryData<Portfolio | null>(queryKeys.portfolio(user.id, id), (current) =>
        current ? { ...current, name: updatedPortfolio.name, description: updatedPortfolio.description } : current,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.portfolios(user.id) })
    },
  })

  const deletePortfolioMutation = useMutation({
    mutationFn: () => deletePortfolio(id),
    onSuccess: () => {
      if (user) {
        queryClient.setQueryData<any[]>(queryKeys.portfolios(user.id), (current = []) =>
          current.filter((portfolioItem) => portfolioItem.id !== id),
        )
        void queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(user.id) })
      }
      router.push("/portfolios")
    },
  })

  const addAssetMutation = useMutation({
    mutationFn: () =>
      addAssetToPortfolio(id, {
        assetId: newAsset.assetId,
        quantity: newAsset.quantity,
        averageBuyPrice: newAsset.averageBuyPrice,
      }),
    onSuccess: () => {
      invalidatePortfolioData()
    },
  })

  const removeAssetMutation = useMutation({
    mutationFn: (assetId: string) => removeAssetFromPortfolio(id, assetId),
    onSuccess: (_result, assetId) => {
      if (user) {
        queryClient.setQueryData<Portfolio | null>(queryKeys.portfolio(user.id, id), (current) =>
          current ? { ...current, assets: current.assets?.filter((asset) => asset.assetId !== assetId) || [] } : current,
        )
      }
      invalidatePortfolioData()
    },
  })

  const handleUpdatePortfolio = async () => {
    if (!portfolio) return

    setMessage(null)

    try {
      const updatedPortfolio = await updatePortfolioMutation.mutateAsync()
      if (!updatedPortfolio) {
        setMessage({ type: "error", text: t("errors.unavailable") })
        return
      }

      setMessage({ type: "success", text: t("actions.saveChanges") })
    } catch (error) {
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  const handleDeletePortfolio = async () => {
    if (!portfolio) return

    if (!confirm(t("portfolios.confirmDelete"))) {
      return
    }

    try {
      await deletePortfolioMutation.mutateAsync()
    } catch (error) {
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  const handleAddAsset = async () => {
    if (!portfolio || !newAsset.assetId || newAsset.quantity <= 0 || newAsset.averageBuyPrice <= 0) {
      return
    }

    setMessage(null)

    try {
      await addAssetMutation.mutateAsync()

      setNewAsset({
        assetId: "",
        quantity: 0,
        averageBuyPrice: 0,
      })

      setIsAddAssetOpen(false)
      setMessage({ type: "success", text: t("actions.addAsset") })
    } catch (error) {
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  const handleRemoveAsset = async (assetId: string) => {
    if (!portfolio) return

    if (!confirm(t("portfolios.confirmRemoveAsset"))) {
      return
    }

    try {
      await removeAssetMutation.mutateAsync(assetId)

      setMessage({ type: "success", text: t("actions.remove") })
    } catch (error) {
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  const isLoading =
    (portfolioResult.isLoading && !portfolioResult.data) || (assetsResult.isLoading && !assetsResult.data)
  const isSaving =
    updatePortfolioMutation.isPending ||
    deletePortfolioMutation.isPending ||
    addAssetMutation.isPending ||
    removeAssetMutation.isPending

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
        <h2 className="text-2xl font-bold mb-2">{t("portfolios.notFound")}</h2>
        <p className="text-muted-foreground mb-4">
          {t("portfolios.notFoundDescription")}
        </p>
        <Button asChild variant="outline">
          <Link href="/portfolios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.backToPortfolios")}
          </Link>
        </Button>
      </div>
    )
  }

  const totalValue =
    portfolio.assets?.reduce((sum, pa) => {
      return sum + pa.quantity * pa.asset.currentPrice
    }, 0) || 0

  const assetsByType =
    portfolio.assets?.reduce(
      (acc, pa) => {
        const type = pa.asset.type
        const value = pa.quantity * pa.asset.currentPrice

        if (!acc[type]) {
          acc[type] = { type, value: 0 }
        }

        acc[type].value += value
        return acc
      },
      {} as Record<string, { type: string; value: number }>,
    ) || {}

  const allocation = Object.values(assetsByType)

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
      <DashboardHeader heading={portfolio.name} text={portfolio.description || t("portfolios.managePortfolio")}>
        <Button variant="outline" asChild>
          <Link href="/portfolios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Link>
        </Button>
      </DashboardHeader>

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">{t("portfolios.assets")}</TabsTrigger>
          <TabsTrigger value="allocation">{t("portfolios.allocation")}</TabsTrigger>
          <TabsTrigger value="settings">{t("common.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("portfolios.portfolioAssets")}</CardTitle>
                <CardDescription>{t("portfolios.portfolioAssetsDescription")}</CardDescription>
              </div>
              <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("actions.addAsset")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("portfolios.addAssetDialogTitle")}</DialogTitle>
                    <DialogDescription>{t("portfolios.addAssetDialogDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="asset" className="text-right">
                        {t("transactions.asset")}
                      </Label>
                      <Select
                        value={newAsset.assetId}
                        onValueChange={(value) => setNewAsset({ ...newAsset, assetId: value })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder={t("transactions.selectAsset")} />
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
                        {t("transactions.quantity")}
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
                        {t("portfolios.averageBuyPrice")}
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        value={newAsset.averageBuyPrice || ""}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, averageBuyPrice: Number.parseFloat(e.target.value) })
                        }
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={handleAddAsset} disabled={isSaving}>
                      {isSaving ? t("common.loading") : t("actions.addAsset")}
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
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.symbol")}</TableHead>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("common.type")}</TableHead>
                      <TableHead className="text-right">{t("transactions.quantity")}</TableHead>
                      <TableHead className="text-right">{t("portfolios.averageBuyPrice")}</TableHead>
                      <TableHead className="text-right">{t("assets.currentPrice")}</TableHead>
                      <TableHead className="text-right">{t("common.value")}</TableHead>
                      <TableHead className="text-right">{t("portfolios.gainLoss")}</TableHead>
                      <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.assets && portfolio.assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          {t("portfolios.noAssetsForAllocation")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      portfolio.assets?.map((pa) => {
                        const currentValue = pa.quantity * pa.asset.currentPrice
                        const costBasis = pa.quantity * pa.averageBuyPrice
                        const gainLoss = currentValue - costBasis
                        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

                        return (
                          <TableRow key={pa.assetId}>
                            <TableCell className="font-medium">{pa.asset.symbol}</TableCell>
                            <TableCell>{pa.asset.name}</TableCell>
                            <TableCell>{getAssetTypeLabel(pa.asset.type, t)}</TableCell>
                            <TableCell className="text-right">{pa.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              ${pa.averageBuyPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              ${pa.asset.currentPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${currentValue.toLocaleString(undefined, {
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
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveAsset(pa.assetId)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">{t("actions.remove")}</span>
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
                  <p className="text-sm text-muted-foreground">{t("portfolios.totalAssets")}</p>
                  <p className="text-xl font-bold">{portfolio.assets?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("portfolios.totalValue")}</p>
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
              <CardTitle>{t("portfolios.allocation")}</CardTitle>
              <CardDescription>{t("portfolios.allocationDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {allocation.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("portfolios.noAssetsForAllocation")}
                </div>
              ) : (
                <>
                  <div className="h-[200px] w-full relative mb-6">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-32 w-32 rounded-full border-8 border-transparent bg-background flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{t("common.total")}</p>
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
                          <span className="text-sm">{getAssetTypeLabel(item.type, t)}</span>
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
              <CardTitle>{t("portfolios.settingsTitle")}</CardTitle>
              <CardDescription>{t("portfolios.settingsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("common.description")}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("portfolios.createdAt")}</Label>
                <div className="p-2 border rounded-md bg-muted/50">
                  {new Date(portfolio.createdAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive" onClick={handleDeletePortfolio}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("actions.deletePortfolio")}
              </Button>
              <Button onClick={handleUpdatePortfolio} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? t("common.loading") : t("actions.saveChanges")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
