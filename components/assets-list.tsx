"use client"

import { useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ArrowUpDown, Plus, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type AssetTypeValue = "stock" | "etf" | "bond" | "crypto" | "realEstate" | "other"

interface Asset {
  id: string
  name: string
  ticker: string
  type: AssetTypeValue
  shares: number
  price: number
  value: number
  change: number
}

export function AssetsList() {
  const { t } = useI18n()
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "1",
      name: "Apple Inc.",
      ticker: "AAPL",
      type: "stock",
      shares: 10,
      price: 175.25,
      value: 1752.5,
      change: 2.3,
    },
    {
      id: "2",
      name: "Microsoft Corporation",
      ticker: "MSFT",
      type: "stock",
      shares: 5,
      price: 325.76,
      value: 1628.8,
      change: 1.5,
    },
    {
      id: "3",
      name: "Vanguard Total Stock Market ETF",
      ticker: "VTI",
      type: "etf",
      shares: 8,
      price: 235.42,
      value: 1883.36,
      change: 0.8,
    },
    {
      id: "4",
      name: "US Treasury Bond 2.5% 2030",
      ticker: "USTB30",
      type: "bond",
      shares: 1,
      price: 950.0,
      value: 950.0,
      change: -0.2,
    },
    {
      id: "5",
      name: "Bitcoin",
      ticker: "BTC",
      type: "crypto",
      shares: 0.05,
      price: 42000.0,
      value: 2100.0,
      change: 3.5,
    },
  ])

  const [sortColumn, setSortColumn] = useState<keyof Asset>("value")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    type: "stock",
  })

  const handleSort = (column: keyof Asset) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
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

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.ticker || !newAsset.shares || !newAsset.price) {
      return
    }

    const value = (newAsset.shares || 0) * (newAsset.price || 0)

    const asset: Asset = {
      id: Date.now().toString(),
      name: newAsset.name || "",
      ticker: newAsset.ticker || "",
      type: newAsset.type || "stock",
      shares: newAsset.shares || 0,
      price: newAsset.price || 0,
      value,
      change: 0,
    }

    setAssets([...assets, asset])
    setNewAsset({ type: "stock" })
    setIsAddAssetOpen(false)
  }

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter((asset) => asset.id !== id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t("assets.title")}</CardTitle>
          <CardDescription>{t("assets.description")}</CardDescription>
        </div>
        <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="mt-2 sm:mt-0">
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
                <Label htmlFor="ticker" className="text-right">
                  {t("common.symbol")}
                </Label>
                <Input
                  id="ticker"
                  value={newAsset.ticker || ""}
                  onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  {t("common.type")}
                </Label>
                <Select value={newAsset.type} onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("assets.selectAssetType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">{t("assetType.stock")}</SelectItem>
                    <SelectItem value="etf">{t("assetType.etf")}</SelectItem>
                    <SelectItem value="bond">{t("assetType.bond")}</SelectItem>
                    <SelectItem value="crypto">{t("assetType.crypto")}</SelectItem>
                    <SelectItem value="realEstate">{t("assetType.realEstate")}</SelectItem>
                    <SelectItem value="other">{t("assetType.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shares" className="text-right">
                  {t("assets.sharesUnits")}
                </Label>
                <Input
                  id="shares"
                  type="number"
                  value={newAsset.shares || ""}
                  onChange={(e) => setNewAsset({ ...newAsset, shares: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  {t("common.price")}
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={newAsset.price || ""}
                  onChange={(e) => setNewAsset({ ...newAsset, price: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddAsset}>{t("actions.addAsset")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("name")}>
                    {t("common.name")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("ticker")}>
                    {t("common.symbol")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("type")}>
                    {t("common.type")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("shares")}>
                    {t("assets.shares")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("price")}>
                    {t("common.price")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("value")}>
                    {t("common.value")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("change")}>
                    {t("assets.change24h")}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.ticker}</TableCell>
                  <TableCell>{getAssetTypeLabel(asset.type, t)}</TableCell>
                  <TableCell className="text-right">{asset.shares.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      asset.change > 0 ? "text-green-500" : asset.change < 0 ? "text-red-500" : "",
                    )}
                  >
                    {asset.change > 0 ? "+" : ""}
                    {asset.change}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="icon">
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

