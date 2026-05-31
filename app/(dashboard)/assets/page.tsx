"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DashboardHeader } from "@/components/dashboard-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { createAsset, deleteAsset, triggerAssetPricesUpdate, type Asset } from "@/entities/asset/api"
import { useI18n } from "@/contexts/i18n-context"
import { getAssetTypeLabel } from "@/lib/i18n-display"
import {
  assetPresetsByType,
  customAssetPresetValue,
  supportedAssetCurrencies,
  type AssetPreset,
  type AssetTypeValue,
} from "@/shared/config/asset-presets"
import { Info, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { assetsQuery, queryKeys } from "@/lib/query-options"

type AssetFormState = {
  type: AssetTypeValue
  preset: string
  symbol: string
  name: string
  currentPrice: string
  currency: string
}

const assetTypes: AssetTypeValue[] = ["stock", "bond", "etf", "crypto", "commodity", "other"]

const initialAssetForm: AssetFormState = {
  type: "stock",
  preset: customAssetPresetValue,
  symbol: "",
  name: "",
  currentPrice: "0",
  currency: "USD",
}

const tickerPattern = /^[A-Z0-9._-]{1,15}$/

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function applyPreset(preset: AssetPreset): AssetFormState {
  return {
    type: preset.type,
    preset: preset.symbol,
    symbol: preset.symbol,
    name: preset.name,
    currentPrice: String(preset.defaultPrice ?? 0),
    currency: preset.currency,
  }
}

export default function AssetsPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newAsset, setNewAsset] = useState<AssetFormState>(initialAssetForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const selectedPresets = useMemo(() => assetPresetsByType[newAsset.type] ?? [], [newAsset.type])
  const isCustomInstrument = newAsset.preset === customAssetPresetValue

  const assetsResult = useQuery(assetsQuery())
  const assets = assetsResult.data ?? []

  const invalidateAssetDependents = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.assets() })
    void queryClient.invalidateQueries({ queryKey: ["portfolio-allocation"] })
    void queryClient.invalidateQueries({ queryKey: ["portfolio"] })
    void queryClient.invalidateQueries({ queryKey: ["portfolios"] })
    void queryClient.invalidateQueries({ queryKey: ["analytics"] })
    void queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] })
  }

  const createAssetMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: (createdAsset) => {
      queryClient.setQueryData<Asset[]>(queryKeys.assets(), (current = []) =>
        [...current, createdAsset].sort((a, b) => a.symbol.localeCompare(b.symbol)),
      )
      invalidateAssetDependents()
    },
  })

  const deleteAssetMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Asset[]>(queryKeys.assets(), (current = []) => current.filter((asset) => asset.id !== id))
      invalidateAssetDependents()
    },
  })

  const refreshPricesMutation = useMutation({
    mutationFn: triggerAssetPricesUpdate,
    onSuccess: () => {
      invalidateAssetDependents()
    },
  })

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddAssetOpen(open)
    if (!open) {
      setNewAsset(initialAssetForm)
      setFormError(null)
    }
  }

  const handleTypeChange = (type: AssetTypeValue) => {
    setFormError(null)
    setNewAsset({
      ...initialAssetForm,
      type,
      preset: customAssetPresetValue,
    })
  }

  const handlePresetChange = (value: string) => {
    setFormError(null)
    if (value === customAssetPresetValue) {
      setNewAsset({
        ...initialAssetForm,
        type: newAsset.type,
        preset: customAssetPresetValue,
      })
      return
    }

    const preset = selectedPresets.find((item) => item.symbol === value)
    if (preset) {
      setNewAsset(applyPreset(preset))
    }
  }

  const getValidationError = () => {
    const symbol = newAsset.symbol.trim().toUpperCase()
    const name = newAsset.name.trim()
    const currentPrice = Number(newAsset.currentPrice)

    if (!symbol) return t("assets.form.validation.tickerRequired")
    if (!tickerPattern.test(symbol)) return t("assets.form.validation.tickerFormat")
    if (!name) return t("assets.form.validation.nameRequired")
    if (!assetTypes.includes(newAsset.type)) return t("assets.form.validation.typeRequired")
    if (!Number.isFinite(currentPrice) || currentPrice < 0) return t("assets.form.validation.priceInvalid")
    if (!supportedAssetCurrencies.includes(newAsset.currency as (typeof supportedAssetCurrencies)[number])) {
      return t("assets.form.validation.currencyRequired")
    }

    return null
  }

  const getSubmitErrorMessage = (error: unknown) => {
    const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined
    if (code === "DUPLICATE_SYMBOL") return t("assets.form.validation.duplicateSymbol")
    if (code === "TICKER_REQUIRED") return t("assets.form.validation.tickerRequired")
    if (code === "TICKER_INVALID") return t("assets.form.validation.tickerFormat")
    if (code === "NAME_REQUIRED") return t("assets.form.validation.nameRequired")
    if (code === "TYPE_INVALID") return t("assets.form.validation.typeRequired")
    if (code === "PRICE_INVALID") return t("assets.form.validation.priceInvalid")
    if (code === "CURRENCY_INVALID") return t("assets.form.validation.currencyRequired")
    return t("assets.form.validation.requestFailed")
  }

  const handleAddAsset = async () => {
    const validationError = getValidationError()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setFormError(null)

    try {
      await createAssetMutation.mutateAsync({
        symbol: newAsset.symbol.trim().toUpperCase(),
        name: newAsset.name.trim(),
        type: newAsset.type,
        currentPrice: Number(newAsset.currentPrice),
        currency: newAsset.currency,
      })

      setNewAsset(initialAssetForm)
      setIsAddAssetOpen(false)
    } catch (error) {
      setFormError(getSubmitErrorMessage(error))
    }
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm(t("assets.confirmDelete"))) {
      return
    }

    try {
      await deleteAssetMutation.mutateAsync(id)
    } catch (error) {
      console.error("Error deleting asset:", error)
      setPageError(t("assets.deleteFailed"))
    }
  }

  const handleRefreshPrices = async () => {
    setPageError(null)
    try {
      await refreshPricesMutation.mutateAsync()
    } catch (error) {
      console.error("Error updating asset prices:", error)
      setPageError(t("errors.unavailable"))
    }
  }

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  )
  const isLoading = assetsResult.isLoading && !assetsResult.data
  const isRefreshing = refreshPricesMutation.isPending || (assetsResult.isFetching && !isLoading)
  const isSubmitting = createAssetMutation.isPending

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("assets.title")} text={t("assets.description")}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefreshPrices} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? t("assets.updatingPrices") : t("assets.updatePrices")}
          </Button>
          <Dialog open={isAddAssetOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("assets.addAsset")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{t("assets.addDialogTitle")}</DialogTitle>
                <DialogDescription>{t("assets.form.description")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{t("assets.form.catalogNotice")}</AlertDescription>
                </Alert>

                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="asset-type">{t("assets.form.type")}</Label>
                    <Select value={newAsset.type} onValueChange={(value) => handleTypeChange(value as AssetTypeValue)}>
                      <SelectTrigger id="asset-type">
                        <SelectValue placeholder={t("assets.selectAssetType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getAssetTypeLabel(type, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset-preset">{t("assets.form.preset")}</Label>
                    <Select value={newAsset.preset} onValueChange={handlePresetChange}>
                      <SelectTrigger id="asset-preset">
                        <SelectValue placeholder={t("assets.form.selectInstrument")} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPresets.map((preset) => (
                          <SelectItem key={`${preset.type}-${preset.symbol}`} value={preset.symbol}>
                            {preset.symbol} - {preset.name}
                          </SelectItem>
                        ))}
                        <SelectItem value={customAssetPresetValue}>{t("assets.form.customInstrument")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">{t("assets.form.ticker")}</Label>
                    <Input
                      id="symbol"
                      value={newAsset.symbol}
                      onChange={(event) =>
                        setNewAsset((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))
                      }
                      disabled={!isCustomInstrument}
                      placeholder={t("assets.form.tickerPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("assets.form.name")}</Label>
                    <Input
                      id="name"
                      value={newAsset.name}
                      onChange={(event) => setNewAsset((current) => ({ ...current, name: event.target.value }))}
                      disabled={!isCustomInstrument}
                      placeholder={t("assets.form.namePlaceholder")}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t("assets.form.currentPrice")}</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAsset.currentPrice}
                      onChange={(event) => setNewAsset((current) => ({ ...current, currentPrice: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t("assets.form.currency")}</Label>
                    <Select
                      value={newAsset.currency}
                      onValueChange={(value) => setNewAsset((current) => ({ ...current, currency: value }))}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder={t("transactions.selectCurrency")} />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedAssetCurrencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleAddAsset} disabled={isSubmitting}>
                  {isSubmitting ? t("common.loading") : t("assets.addAsset")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardHeader>

      {pageError && (
        <Alert variant="destructive">
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("assets.searchPlaceholder")}
                className="pl-8"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
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
                      <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">
                        {searchQuery ? t("assets.noAssetsBySearch") : t("assets.noAssets")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.symbol}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>{getAssetTypeLabel(asset.type, t)}</TableCell>
                        <TableCell className="text-right">{formatPrice(asset.currentPrice)}</TableCell>
                        <TableCell>{asset.currency}</TableCell>
                        <TableCell className="text-right">{new Date(asset.updatedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/assets/${asset.id}`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">{t("common.edit")}</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAsset(asset.id)}
                              disabled={deleteAssetMutation.isPending}
                            >
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
