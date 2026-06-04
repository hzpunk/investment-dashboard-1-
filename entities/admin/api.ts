import { apiFetch } from "@/lib/api-client"

type AdminSetting = {
  id: string
  settingKey: string
  settingValue: string
  description: string | null
  updatedAt: string
}

type AdminSettingResponse = {
  id: string
  settingKey: string
  settingValue: string
  description: string | null
  updatedAt: string
}

function toLegacySetting(setting: AdminSettingResponse): AdminSetting {
  return {
    id: setting.id,
    settingKey: setting.settingKey,
    settingValue: setting.settingValue,
    description: setting.description,
    updatedAt: setting.updatedAt,
  }
}

export async function fetchAdminSettings() {
  const data = await apiFetch<{ settings: AdminSettingResponse[] }>("/api/admin/settings", { credentials: "include" })
  return data.settings.map(toLegacySetting)
}

export async function updateAdminSetting(id: string, value: string) {
  const data = await apiFetch<{ setting: AdminSettingResponse }>(`/api/admin/settings/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  })

  return toLegacySetting(data.setting)
}

export async function createAdminSetting(setting: Omit<AdminSetting, "id" | "updatedAt">) {
  const data = await apiFetch<{ setting: AdminSettingResponse }>("/api/admin/settings", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: setting.settingKey,
      value: setting.settingValue,
      description: setting.description,
    }),
  })

  return toLegacySetting(data.setting)
}

export async function isUserAdmin(userId: string) {
  const data = await apiFetch<{ user: { id: string; role: string } | null }>("/api/auth/me", { credentials: "include" })
  return data.user?.id === userId && data.user.role === "admin"
}
