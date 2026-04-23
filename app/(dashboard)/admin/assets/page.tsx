"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Pencil, Trash2, Search, RefreshCw, ArrowUpDown } from "lucide-react"
import { fetchAssets, createAsset, deleteAsset, updateAssetPrices, updateAsset } from "@/entities/asset/api"
import type { Database } from "@/types/supabase"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"

type Asset = Database["public"]["Tables"]["assets"]["Row"]

export default function AdminAssetsPage() {
  const { user, userRole } = useAuth()
  const { t } = useI18n()
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof Asset>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    type: "stock",
    currency: "USD",
  })
  const [editAsset, setEditAsset] = useState<Asset | null>(null)

  useEffect(() => {
    const loadAssets = async () => {
      setIsLoading(true)
      try {
        const data = await fetchAssets()
        setAssets(data)
      } catch (error) {
        console.error("Error fetching assets:", error)
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    loadAssets()
  }, [])

  // Check if user is admin
  if (userRole !== "admin") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-muted-foreground">{t("admin.accessDeniedDescription")}</p>
        </div>
      </div>
    )
  }

  const handleSort = (column: keyof Asset) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedAssets = [...assets].sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }

    return sortDirection === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
  })

  const filteredAssets = sortedAssets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddAsset = async () => {
    if (!newAsset.symbol || !newAsset.name || !newAsset.type || !newAsset.current_price) {
      setMessage({ type: "error", text: t("admin.requiredFields") })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const createdAsset = await createAsset({
        symbol: newAsset.symbol,
        name: newAsset.name,
        type: newAsset.type as any,
        current_price: newAsset.current_price,
        currency: newAsset.currency || "USD",
      })

      setAssets([...assets, createdAsset])
      setNewAsset({
        type: "stock",
        currency: "USD",
      })
      setIsAddAssetOpen(false)
      setMessage({ type: "success", text: t("actions.addAsset") })
    } catch (error) {
      console.error("Error adding asset:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAsset = async () => {
    if (!editAsset || !editAsset.symbol || !editAsset.name || !editAsset.type || !editAsset.current_price) {
      setMessage({ type: "error", text: t("admin.requiredFields") })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const updatedAsset = await updateAsset(editAsset.id, {
        symbol: editAsset.symbol,
        name: editAsset.name,
        type: editAsset.type as any,
        current_price: editAsset.current_price,
        currency: editAsset.currency,
      })

      setAssets(assets.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)))
      setEditAsset(null)
      setIsEditAssetOpen(false)
      setMessage({ type: "success", text: t("actions.saveChanges") })
    } catch (error) {
      console.error("Error updating asset:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm(t("assets.confirmDelete"))) {
      return
    }

    try {
      await deleteAsset(id)
      setAssets(assets.filter((asset) => asset.id !== id))
      setMessage({ type: "success", text: t("actions.deleteAsset") })
    } catch (error) {
      console.error("Error deleting asset:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    }
  }

  const handleRefreshPrices = async () => {
    setIsRefreshing(true)
    setMessage(null)
    try {
      await updateAssetPrices()
      // Reload assets with updated prices
      const updatedAssets = await fetchAssets()
      setAssets(updatedAssets)
      setMessage({ type: "success", text: t("assets.updatePrices") })
    } catch (error) {
      console.error("Error updating asset prices:", error)
      setMessage({ type: "error", text: t("settings.profileUpdateFailed") })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("admin.assetsTitle")} text={t("admin.assetsDescription")}>
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
                <DialogDescription>Enter the details of the investment asset.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="symbol" className="text-right">
                    Symbol
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
                    Name
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
                    Type
                  </Label>
                  <Select
                    value={newAsset.type as string}
                    onValueChange={(value) => setNewAsset({ ...newAsset, type: value as any })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t("assets.selectAssetType")} />
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Current Price
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
                    Currency
                  </Label>
                  <Select
                    value={newAsset.currency}
                    onValueChange={(value) => setNewAsset({ ...newAsset, currency: value })}
                  >
                    <SelectTrigger className="col-span-3">
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAsset} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Asset"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardHeader>

      <Card>
        <CardContent className="p-6">
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
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
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("symbol")}>
                        Symbol
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("name")}>
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("type")}>
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("current_price")}>
                        Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("currency")}>
                        Currency
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("updated_at")}>
                        Last Updated
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditAsset(asset)
                                setIsEditAssetOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">{t("common.edit")}</span>
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

      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update the details of the investment asset.</DialogDescription>
          </DialogHeader>
          {editAsset && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-symbol" className="text-right">
                  Symbol
                </Label>
                <Input
                  id="edit-symbol"
                  value={editAsset.symbol}
                  onChange={(e) => setEditAsset({ ...editAsset, symbol: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editAsset.name}
                  onChange={(e) => setEditAsset({ ...editAsset, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={editAsset.type}
                  onValueChange={(value) => setEditAsset({ ...editAsset, type: value as any })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("assets.selectAssetType")} />
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Current Price
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editAsset.current_price}
                  onChange={(e) => setEditAsset({ ...editAsset, current_price: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-currency" className="text-right">
                  Currency
                </Label>
                <Select
                  value={editAsset.currency}
                  onValueChange={(value) => setEditAsset({ ...editAsset, currency: value })}
                >
                  <SelectTrigger className="col-span-3">
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAssetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAsset} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

