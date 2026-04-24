"use client"

import type React from "react"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
// I18nProvider is a client component because it uses useState, useEffect and localStorage
import { defaultLocale, localeStorageKey, normalizeLocale, type Locale, t as translate } from "@/lib/i18n"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem(localeStorageKey)
      const nextLocale = normalizeLocale(storedLocale)
      setLocaleState(nextLocale)
    } catch {
      setLocaleState(defaultLocale)
    }
  }, [])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(normalizeLocale(nextLocale))
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(localeStorageKey, locale)
    } catch {
      // Ignore storage errors (private mode / disabled storage).
    }
  }, [locale])

  const t = useCallback(
    (key: string) => {
      return translate(locale, key)
    },
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }

  return context
}
