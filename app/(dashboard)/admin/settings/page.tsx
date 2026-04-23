"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Save } from "lucide-react"
import { fetchAdminSettings, updateAdminSetting, createAdminSetting, isUserAdmin } from "@/entities/admin/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useI18n } from "@/contexts/i18n-context"

type AdminSetting = {
  id: string
  setting_key: string
  setting_value: string
  description: string | null
  updated_at: string
}

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [settings, setSettings] = useState<AdminSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [isAddSettingOpen, setIsAddSettingOpen] = useState(false)
  const [newSetting, setNewSetting] = useState<{
    key: string
    value: string
    description: string
  }>({
    key: "",
    value: "",
    description: "",
  })

  useEffect(() => {
    const checkAdminAndLoadSettings = async () => {
      if (!user) return

      setIsLoading(true)
      try {
        // Check if user is admin
        const admin = await isUserAdmin(user.id)
        setIsAdmin(admin)

        if (admin) {
          // Fetch settings
          const settingsData = await fetchAdminSettings()
          setSettings(settingsData)
        }
      } catch (error) {
        console.error("Error loading admin settings:", error)
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAndLoadSettings()
  }, [user])

  const handleSettingChange = (id: string, value: string) => {
    setEditedSettings({
      ...editedSettings,
      [id]: value,
    })
  }

  const handleSaveSetting = async (id: string) => {
    if (!editedSettings[id]) return

    setIsSaving(true)
    setMessage(null)

    try {
      const updatedSetting = await updateAdminSetting(id, editedSettings[id])

      // Update settings in state
      setSettings(settings.map((setting) => (setting.id === id ? updatedSetting : setting)))

      // Clear from edited settings
      const newEditedSettings = { ...editedSettings }
      delete newEditedSettings[id]
      setEditedSettings(newEditedSettings)

      setMessage({ type: "success", text: t("admin.settingsSaved") })
    } catch (error) {
      console.error("Error updating setting:", error)
      setMessage({ type: "error", text: t("admin.settingsSaveFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSetting = async () => {
    if (!newSetting.key || !newSetting.value) return

    setIsSaving(true)
    setMessage(null)

    try {
      const createdSetting = await createAdminSetting({
        setting_key: newSetting.key,
        setting_value: newSetting.value,
        description: newSetting.description || null,
      })

      // Add to settings list
      setSettings([...settings, createdSetting])

      // Reset form
      setNewSetting({
        key: "",
        value: "",
        description: "",
      })

      setIsAddSettingOpen(false)
      setMessage({ type: "success", text: t("admin.settingsSaved") })
    } catch (error) {
      console.error("Error creating setting:", error)
      setMessage({ type: "error", text: t("admin.settingsSaveFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
        <p className="text-muted-foreground mb-4">{t("admin.accessDeniedDescription")}</p>
        <Button asChild variant="outline">
          <a href="/dashboard">{t("actions.backToDashboard")}</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("common.settings")} text={t("admin.securityDescription")}>
        <Dialog open={isAddSettingOpen} onOpenChange={setIsAddSettingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("common.add")} {t("common.settings")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.create")} {t("common.settings")}</DialogTitle>
              <DialogDescription>{t("common.description")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="setting-key" className="text-right">
                  Key
                </Label>
                <Input
                  id="setting-key"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="setting-value" className="text-right">
                  Value
                </Label>
                <Input
                  id="setting-value"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="setting-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="setting-description"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddSettingOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddSetting} disabled={isSaving}>
                {isSaving ? t("common.loading") : t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general application settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings
                .filter((setting) => setting.setting_key.startsWith("general."))
                .map((setting) => (
                  <div key={setting.id} className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`setting-${setting.id}`}>{setting.setting_key.replace("general.", "")}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveSetting(setting.id)}
                        disabled={!editedSettings[setting.id]}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                    {setting.description && <p className="text-sm text-muted-foreground">{setting.description}</p>}
                    <Input
                      id={`setting-${setting.id}`}
                      value={
                        editedSettings[setting.id] !== undefined ? editedSettings[setting.id] : setting.setting_value
                      }
                      onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>Configure API keys and endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings
                .filter((setting) => setting.setting_key.startsWith("api."))
                .map((setting) => (
                  <div key={setting.id} className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`setting-${setting.id}`}>{setting.setting_key.replace("api.", "")}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveSetting(setting.id)}
                        disabled={!editedSettings[setting.id]}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                    {setting.description && <p className="text-sm text-muted-foreground">{setting.description}</p>}
                    <Input
                      id={`setting-${setting.id}`}
                      value={
                        editedSettings[setting.id] !== undefined ? editedSettings[setting.id] : setting.setting_value
                      }
                      onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and authentication settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings
                .filter((setting) => setting.setting_key.startsWith("security."))
                .map((setting) => (
                  <div key={setting.id} className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`setting-${setting.id}`}>{setting.setting_key.replace("security.", "")}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveSetting(setting.id)}
                        disabled={!editedSettings[setting.id]}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                    {setting.description && <p className="text-sm text-muted-foreground">{setting.description}</p>}
                    <Input
                      id={`setting-${setting.id}`}
                      value={
                        editedSettings[setting.id] !== undefined ? editedSettings[setting.id] : setting.setting_value
                      }
                      onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    />
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

