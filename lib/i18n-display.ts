import type { Locale } from "@/lib/i18n"

type Translate = (key: string) => string

export function getTransactionTypeLabel(type: string | null | undefined, t: Translate): string {
  if (!type) {
    return t("common.unknown")
  }

  return t(`transactionType.${type}`)
}

export function getAccountTypeLabel(type: string | null | undefined, t: Translate): string {
  if (!type) {
    return t("common.unknown")
  }

  return t(`accountType.${type}`)
}

export function getAssetTypeLabel(type: string | null | undefined, t: Translate): string {
  if (!type) {
    return t("common.unknown")
  }

  return t(`assetType.${type}`)
}

export function getRoleLabel(role: string | null | undefined, t: Translate): string {
  if (!role) {
    return t("common.unknown")
  }

  return t(`role.${role}`)
}

export function getStatusLabel(status: string | null | undefined, t: Translate): string {
  if (!status) {
    return t("common.unknown")
  }

  return t(`status.${status}`)
}

export function getNotificationTypeLabel(type: string | null | undefined, t: Translate): string {
  if (!type) {
    return t("common.unknown")
  }

  return t(`notifications.type.${type}`)
}

export function formatLocaleDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US")
}

export function formatLocaleDateTime(date: Date, locale: Locale): string {
  return date.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")
}

export function formatLocaleTime(date: Date, locale: Locale): string {
  return date.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US")
}
