"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useI18n } from "@/contexts/i18n-context"

export default function AdminSecurityPage() {
  const { userRole } = useAuth()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: "8",
    requireSpecialChars: true,
    requireNumbers: true,
    requireUppercase: true,
    maxLoginAttempts: "5",
    lockoutDuration: "30",
    sessionTimeout: "60",
    twoFactorEnabled: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      if (userRole !== "admin") {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const res = await fetch("/api/admin/settings", { credentials: "include" })
        const data = await res.json().catch(() => null)

        if (!res.ok) throw new Error(data?.error || t("admin.settingsSaveFailed"))

        const settings = (data?.settings || []).reduce(
          (acc: typeof securitySettings, setting: { settingKey: string; settingValue: string }) => {
            switch (setting.settingKey) {
              case "security.password_min_length":
                acc.passwordMinLength = setting.settingValue
                break
              case "security.require_special_chars":
                acc.requireSpecialChars = setting.settingValue === "true"
                break
              case "security.require_numbers":
                acc.requireNumbers = setting.settingValue === "true"
                break
              case "security.require_uppercase":
                acc.requireUppercase = setting.settingValue === "true"
                break
              case "security.max_login_attempts":
                acc.maxLoginAttempts = setting.settingValue
                break
              case "security.lockout_duration":
                acc.lockoutDuration = setting.settingValue
                break
              case "security.session_timeout":
                acc.sessionTimeout = setting.settingValue
                break
              case "security.two_factor_enabled":
                acc.twoFactorEnabled = setting.settingValue === "true"
                break
            }
            return acc
          },
          { ...securitySettings },
        )

        setSecuritySettings(settings)
      } catch (error) {
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [userRole])

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

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const settings = [
        ["security.password_min_length", securitySettings.passwordMinLength],
        ["security.require_special_chars", securitySettings.requireSpecialChars],
        ["security.require_numbers", securitySettings.requireNumbers],
        ["security.require_uppercase", securitySettings.requireUppercase],
        ["security.max_login_attempts", securitySettings.maxLoginAttempts],
        ["security.lockout_duration", securitySettings.lockoutDuration],
        ["security.session_timeout", securitySettings.sessionTimeout],
        ["security.two_factor_enabled", securitySettings.twoFactorEnabled],
      ].map(([key, value]) => ({ key, value }))

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t("admin.settingsSaveFailed"))

      setMessage({ type: "success", text: t("admin.settingsSaved") })
    } catch (error) {
      setMessage({ type: "error", text: t("admin.settingsSaveFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("admin.securityTitle")} text={t("admin.securityDescription")} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <Tabs defaultValue="password" className="space-y-4">
          <TabsList>
            <TabsTrigger value="password">{t("settings.password")}</TabsTrigger>
            <TabsTrigger value="authentication">{t("admin.securityTitle")}</TabsTrigger>
            <TabsTrigger value="sessions">{t("common.settings")}</TabsTrigger>
          </TabsList>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.password")}</CardTitle>
                <CardDescription>{t("admin.securityDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-min-length">Minimum Password Length</Label>
                  <Input
                    id="password-min-length"
                    type="number"
                    min="6"
                    max="32"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-special-chars">Require Special Characters</Label>
                  <Switch
                    id="require-special-chars"
                    checked={securitySettings.requireSpecialChars}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({ ...securitySettings, requireSpecialChars: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-numbers">Require Numbers</Label>
                  <Switch
                    id="require-numbers"
                    checked={securitySettings.requireNumbers}
                    onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireNumbers: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-uppercase">Require Uppercase Letters</Label>
                  <Switch
                    id="require-uppercase"
                    checked={securitySettings.requireUppercase}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({ ...securitySettings, requireUppercase: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.securityTitle")}</CardTitle>
                <CardDescription>{t("admin.securityDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Maximum Login Attempts</Label>
                  <Input
                    id="max-login-attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of failed login attempts before account is temporarily locked.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-duration">Account Lockout Duration (minutes)</Label>
                  <Input
                    id="lockout-duration"
                    type="number"
                    min="5"
                    max="1440"
                    value={securitySettings.lockoutDuration}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, lockoutDuration: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="two-factor-enabled">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for all users.</p>
                  </div>
                  <Switch
                    id="two-factor-enabled"
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) =>
                      setSecuritySettings({ ...securitySettings, twoFactorEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>{t("common.settings")}</CardTitle>
                <CardDescription>{t("admin.securityDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    min="5"
                    max="1440"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Time of inactivity before a user is automatically logged out.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? t("common.loading") : t("admin.saveSettings")}
            </Button>
          </div>
        </Tabs>
      )}
    </div>
  )
}

