"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useI18n } from "@/contexts/i18n-context"
import {
  defaultDisplayCurrencyForLocale,
  displayCurrencyStorageKey,
  normalizeDisplayCurrency,
  type DisplayCurrency,
} from "@/lib/currency/display-currency"

type CurrencyContextValue = {
  displayCurrency: DisplayCurrency
  setDisplayCurrency: (currency: DisplayCurrency) => void
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined)

function readStoredDisplayCurrency(locale: string) {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const stored = window.localStorage.getItem(displayCurrencyStorageKey)
    return stored ? normalizeDisplayCurrency(stored, defaultDisplayCurrencyForLocale(locale)) : null
  } catch {
    return null
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n()
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(() =>
    readStoredDisplayCurrency(locale) ?? defaultDisplayCurrencyForLocale(locale),
  )
  const [hasStoredPreference, setHasStoredPreference] = useState(() =>
    typeof window !== "undefined" ? readStoredDisplayCurrency(locale) !== null : false,
  )

  useEffect(() => {
    const stored = readStoredDisplayCurrency(locale)
    if (stored) {
      setDisplayCurrencyState(stored)
      setHasStoredPreference(true)
    }
  }, [])

  useEffect(() => {
    if (!hasStoredPreference) {
      setDisplayCurrencyState(defaultDisplayCurrencyForLocale(locale))
    }
  }, [hasStoredPreference, locale])

  const setDisplayCurrency = useCallback((currency: DisplayCurrency) => {
    const normalized = normalizeDisplayCurrency(currency)
    setDisplayCurrencyState(normalized)
    setHasStoredPreference(true)
    try {
      window.localStorage.setItem(displayCurrencyStorageKey, normalized)
    } catch {
      // Ignore storage errors.
    }
  }, [])

  const value = useMemo(
    () => ({
      displayCurrency,
      setDisplayCurrency,
    }),
    [displayCurrency, setDisplayCurrency],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrencyContext() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error("useCurrencyContext must be used within CurrencyProvider")
  }
  return context
}
