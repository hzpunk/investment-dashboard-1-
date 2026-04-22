"use client"

import { useState } from "react"
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

interface Asset {
  id: string
  name: string
  ticker: string
  type: string
  shares: number
  price: number
  value: number
  change: number
}

export function AssetsList() {
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "1",
      name: "Apple Inc.",
      ticker: "AAPL",
      type: "Stock",
      shares: 10,
      price: 175.25,
      value: 1752.5,
      change: 2.3,
    },
    {
      id: "2",
      name: "Microsoft Corporation",
      ticker: "MSFT",
      type: "Stock",
      shares: 5,
      price: 325.76,
      value: 1628.8,
      change: 1.5,
    },
    {
      id: "3",
      name: "Vanguard Total Stock Market ETF",
      ticker: "VTI",
      type: "ETF",
      shares: 8,
      price: 235.42,
      value: 1883.36,
      change: 0.8,
    },
    {
      id: "4",
      name: "US Treasury Bond 2.5% 2030",
      ticker: "USTB30",
      type: "Bond",
      shares: 1,
      price: 950.0,
      value: 950.0,
      change: -0.2,
    },
    {
      id: "5",
      name: "Bitcoin",
      ticker: "BTC",
      type: "Cryptocurrency",
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
    type: "Stock",
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
      type: newAsset.type || "Stock",
      shares: newAsset.shares || 0,
      price: newAsset.price || 0,
      value,
      change: 0,
    }

    setAssets([...assets, asset])
    setNewAsset({ type: "Stock" })
    setIsAddAssetOpen(false)
  }

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter((asset) => asset.id !== id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Manage your investment assets</CardDescription>
        </div>
        <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="mt-2 sm:mt-0">
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>Enter the details of your investment asset.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="ticker" className="text-right">
                  Ticker
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
                  Type
                </Label>
                <Select value={newAsset.type} onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stock">Stock</SelectItem>
                    <SelectItem value="ETF">ETF</SelectItem>
                    <SelectItem value="Bond">Bond</SelectItem>
                    <SelectItem value="Cryptocurrency">Cryptocurrency</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shares" className="text-right">
                  Shares/Units
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
                  Price
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
                Cancel
              </Button>
              <Button onClick={handleAddAsset}>Add Asset</Button>
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
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("ticker")}>
                    Ticker
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
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("shares")}>
                    Shares
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("price")}>
                    Price
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("value")}>
                    Value
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("change")}>
                    24h Change
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.ticker}</TableCell>
                  <TableCell>{asset.type}</TableCell>
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
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAsset(asset.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
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

