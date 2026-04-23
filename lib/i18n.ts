import enMessages from "@/messages/en.json"
import ruMessages from "@/messages/ru.json"

export const supportedLocales = ["ru", "en"] as const
export type Locale = (typeof supportedLocales)[number]

export const defaultLocale: Locale = "ru"
export const localeStorageKey = "app-locale"

interface Dictionary {
  [key: string]: string | Dictionary
}

const dictionaries: Record<Locale, Dictionary> = {
  ru: ruMessages as Dictionary,
  en: enMessages as Dictionary,
}

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale)
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) {
    return defaultLocale
  }

  return isLocale(value) ? value : defaultLocale
}

function getNestedValue(dictionary: Dictionary, key: string): string | undefined {
  const segments = key.split(".")
  let current: string | Dictionary | undefined = dictionary

  for (const segment of segments) {
    if (!current || typeof current === "string") {
      return undefined
    }

    current = current[segment]
  }

  return typeof current === "string" ? current : undefined
}

export function t(locale: string | null | undefined, key: string): string {
  const normalizedLocale = normalizeLocale(locale)
  const localeDictionary = dictionaries[normalizedLocale]
  const localeValue = getNestedValue(localeDictionary, key)

  if (localeValue) {
    return localeValue
  }

  if (normalizedLocale !== defaultLocale) {
    const fallbackValue = getNestedValue(dictionaries[defaultLocale], key)
    if (fallbackValue) {
      return fallbackValue
    }
  }

  return key
}

export function getDictionary(locale: string | null | undefined): Dictionary {
  return dictionaries[normalizeLocale(locale)]
}
