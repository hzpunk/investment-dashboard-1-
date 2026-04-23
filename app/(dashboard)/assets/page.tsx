"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Search, RefreshCw } from "lucide-react"
import { fetchAssets, createAsset, deleteAsset, updateAssetPrices } from "@/entities/asset/api"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"

type Asset = Database["public"]["Tables"]["assets"]["Row"]

export default function AssetsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    type: "stock",
    currency: "USD",
  })

  useEffect(() => {
    const loadAssets = async () => {
      setIsLoading(true)
      try {
        const data = await fetchAssets()
        setAssets(data)
      } catch (error) {
        console.error("Error fetching assets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssets()
  }, [])

  const handleAddAsset = async () => {
    if (!newAsset.symbol || !newAsset.name || !newAsset.type || !newAsset.current_price) {
      return
    }

    setIsSubmitting(true)

    try {
      await createAsset({
        symbol: newAsset.symbol,
        name: newAsset.name,
        type: newAsset.type as any,
        current_price: newAsset.current_price,
        currency: newAsset.currency || "USD",
      })

      // Refresh the page to show the new asset
      window.location.reload()
    } catch (error) {
      console.error("Error adding asset:", error)
    } finally {
      setIsSubmitting(false)
      setIsAddAssetOpen(false)
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm(t("assets.confirmDelete"))) {
      return
    }

    try {
      await deleteAsset(id)
      setAssets(assets.filter((asset) => asset.id !== id))
    } catch (error) {
      console.error("Error deleting asset:", error)
    }
  }

  const handleRefreshPrices = async () => {
    setIsRefreshing(true)
    try {
      await updateAssetPrices()
      // Reload assets with updated prices
      const updatedAssets = await fetchAssets()
      setAssets(updatedAssets)
    } catch (error) {
      console.error("Error updating asset prices:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("assets.title")} text={t("assets.description")}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshPrices} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("assets.updatingPrices") : t("assets.updatePrices")}
          </Button>
          <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("actions.addAsset")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("assets.addDialogTitle")}</DialogTitle>
                <DialogDescription>{t("assets.addDialogDescription")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">
                    {t("common.symbol")}
                  </Label>
                  <Input
                    id="symbol"
                    value={newAsset.symbol || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    {t("common.name")}
                  </Label>
                  <Input
                    id="name"
                    value={newAsset.name || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    {t("common.type")}
                  </Label>
                  <Select
                    value={newAsset.type as string}
                    onValueChange={(value) => setNewAsset({ ...newAsset, type: value as any })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t("assets.selectAssetType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">{t("assetType.stock")}</SelectItem>
                      <SelectItem value="bond">{t("assetType.bond")}</SelectItem>
                      <SelectItem value="etf">{t("assetType.etf")}</SelectItem>
                      <SelectItem value="crypto">{t("assetType.crypto")}</SelectItem>
                      <SelectItem value="commodity">{t("assetType.commodity")}</SelectItem>
                      <SelectItem value="other">{t("assetType.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    {t("assets.currentPrice")}
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={newAsset.current_price || ""}
                    onChange={(e) => setNewAsset({ ...newAsset, current_price: Number.parseFloat(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currency" className="text-right">
                    {t("common.currency")}
                  </Label>
                  <Select
                    value={newAsset.currency}
                    onValueChange={(value) => setNewAsset({ ...newAsset, currency: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t("transactions.selectCurrency")} />
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleAddAsset} disabled={isSubmitting}>
                  {isSubmitting ? t("common.loading") : t("actions.addAsset")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardHeader>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("assets.searchPlaceholder")}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.symbol")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead className="text-right">{t("common.price")}</TableHead>
                    <TableHead>{t("common.currency")}</TableHead>
                    <TableHead className="text-right">{t("common.lastUpdated")}</TableHead>
                    <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        {searchQuery
                          ? t("assets.noAssetsBySearch")
                          : t("assets.noAssets")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.symbol}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{getAssetTypeLabel(asset.type, t)}</TableCell>
                        <TableCell className="text-right">
                          {asset.current_price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>{asset.currency}</TableCell>
                        <TableCell className="text-right">{new Date(asset.updated_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={`/assets/${asset.id}`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">{t("common.edit")}</span>
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAsset(asset.id)}>
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">{t("common.delete")}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

