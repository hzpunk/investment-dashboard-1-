"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { addNotification } from "@/shared/api/notifications"
import { useI18n } from "@/contexts/i18n-context"

export default function AdminNotificationsPage() {
  const { userRole } = useAuth()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    inAppNotifications: true,
    priceAlerts: true,
    transactionNotifications: true,
    goalNotifications: true,
    systemNotifications: true,
    marketUpdates: false,
  })
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    sendToAll: true,
    selectedUsers: [] as string[],
  })
  const [users, setUsers] = useState<any[]>([])
  const [templates, setTemplates] = useState([
    {
      id: "1",
      name: "Price Alert",
      subject: "Price Alert for {asset}",
      body: "The price of {asset} has {direction} {percentage}% in the last 24 hours.",
      type: "price_alert",
    },
    {
      id: "2",
      name: "Transaction Confirmation",
      subject: "Transaction Confirmation",
      body: "Your {transaction_type} of {quantity} {asset} at {price} has been completed successfully.",
      type: "transaction",
    },
    {
      id: "3",
      name: "Goal Achievement",
      subject: "Goal Achievement",
      body: "Congratulations! You've reached your goal: {goal_name}.",
      type: "goal",
    },
    {
      id: "4",
      name: "System Maintenance",
      subject: "System Maintenance",
      body: "Our system will be undergoing maintenance on {date} from {start_time} to {end_time}.",
      type: "system",
    },
  ])
  const [editingTemplate, setEditingTemplate] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (userRole !== "admin") {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // Fetch notification settings from database
        // In a real app, you would fetch these from your database
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Fetch users for notification targeting
        const { data: userData, error: userError } = await supabase.from("profiles").select("id, username")

        if (userError) throw userError
        setUsers(userData || [])

        // Fetch notification templates
        // In a real app, you would fetch these from your database
        // For now, we'll use the hardcoded templates
      } catch (error) {
        console.error("Error fetching notification data:", error)
        setMessage({ type: "error", text: t("errors.unavailable") })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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
      // In a real app, you would save these settings to your database
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage({ type: "success", text: t("admin.settingsSaved") })
    } catch (error) {
      console.error("Error saving notification settings:", error)
      setMessage({ type: "error", text: t("admin.settingsSaveFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      setMessage({ type: "error", text: t("admin.requiredFields") })
      return
    }

    setIsSendingNotification(true)
    setMessage(null)

    try {
      // In a real app, you would send this notification to users
      // For now, we'll just add it to the local notifications
      addNotification(newNotification.type as any, newNotification.title, newNotification.message)

      // Reset form
      setNewNotification({
        title: "",
        message: "",
        type: "info",
        sendToAll: true,
        selectedUsers: [],
      })

      setMessage({ type: "success", text: t("admin.notificationSent") })
    } catch (error) {
      console.error("Error sending notification:", error)
      setMessage({ type: "error", text: t("admin.notificationSendFailed") })
    } finally {
      setIsSendingNotification(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name || !editingTemplate.subject || !editingTemplate.body) {
      setMessage({ type: "error", text: t("admin.requiredFields") })
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      // In a real app, you would save this template to your database
      // For now, we'll just update the local templates
      setTemplates(templates.map((template) => (template.id === editingTemplate.id ? editingTemplate : template)))
      setEditingTemplate(null)
      setMessage({ type: "success", text: t("admin.templateSaved") })
    } catch (error) {
      console.error("Error saving template:", error)
      setMessage({ type: "error", text: t("admin.templateSaveFailed") })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("admin.notificationsTitle")} text={t("admin.notificationsDescription")} />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <Tabs defaultValue="send" className="space-y-4">
          <TabsList>
            <TabsTrigger value="send">{t("admin.sendNotification")}</TabsTrigger>
            <TabsTrigger value="templates">{t("admin.templates")}</TabsTrigger>
            <TabsTrigger value="settings">{t("admin.saveSettings")}</TabsTrigger>
          </TabsList>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"} className="mb-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="send">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.sendNotification")}</CardTitle>
                <CardDescription>{t("admin.notificationsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notification-title">{t("common.name")}</Label>
                  <Input
                    id="notification-title"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    placeholder={t("common.name")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-message">{t("common.description")}</Label>
                  <Textarea
                    id="notification-message"
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                    placeholder={t("common.description")}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-type">{t("common.type")}</Label>
                  <Select
                    value={newNotification.type}
                    onValueChange={(value) => setNewNotification({ ...newNotification, type: value })}
                  >
                    <SelectTrigger id="notification-type">
                      <SelectValue placeholder={t("common.type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">{t("notifications.type.info")}</SelectItem>
                      <SelectItem value="success">{t("notifications.type.success")}</SelectItem>
                      <SelectItem value="warning">{t("notifications.type.warning")}</SelectItem>
                      <SelectItem value="error">{t("notifications.type.error")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="send-to-all">{t("common.all")}</Label>
                  <Switch
                    id="send-to-all"
                    checked={newNotification.sendToAll}
                    onCheckedChange={(checked) => setNewNotification({ ...newNotification, sendToAll: checked })}
                  />
                </div>
                {!newNotification.sendToAll && (
                  <div className="space-y-2">
                    <Label htmlFor="selected-users">{t("sidebar.userManagement")}</Label>
                    <Select
                      value={newNotification.selectedUsers[0]}
                      onValueChange={(value) => setNewNotification({ ...newNotification, selectedUsers: [value] })}
                    >
                      <SelectTrigger id="selected-users">
                        <SelectValue placeholder={t("auth.username")} />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={handleSendNotification} disabled={isSendingNotification}>
                    <Send className="mr-2 h-4 w-4" />
                    {isSendingNotification ? t("admin.sendingNotification") : t("admin.sendNotification")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.templates")}</CardTitle>
                <CardDescription>{t("admin.notificationsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{template.subject}</TableCell>
                          <TableCell className="capitalize">{template.type.replace("_", " ")}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}>
                                <Bell className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
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
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure system-wide notification settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <Switch
                    id="email-notifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <Switch
                    id="push-notifications"
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                  <Switch
                    id="in-app-notifications"
                    checked={notificationSettings.inAppNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, inAppNotifications: checked })
                    }
                  />
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-3">Notification Types</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="price-alerts">Price Alerts</Label>
                      <Switch
                        id="price-alerts"
                        checked={notificationSettings.priceAlerts}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, priceAlerts: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="transaction-notifications">Transaction Notifications</Label>
                      <Switch
                        id="transaction-notifications"
                        checked={notificationSettings.transactionNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            transactionNotifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="goal-notifications">Goal Notifications</Label>
                      <Switch
                        id="goal-notifications"
                        checked={notificationSettings.goalNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, goalNotifications: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="system-notifications">System Notifications</Label>
                      <Switch
                        id="system-notifications"
                        checked={notificationSettings.systemNotifications}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            systemNotifications: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="market-updates">Market Updates</Label>
                      <Switch
                        id="market-updates"
                        checked={notificationSettings.marketUpdates}
                        onCheckedChange={(checked) =>
                          setNotificationSettings({ ...notificationSettings, marketUpdates: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("common.edit")} {t("admin.templates")}</DialogTitle>
              <DialogDescription>{t("admin.notificationsDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="template-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template-subject" className="text-right">
                  Subject
                </Label>
                <Input
                  id="template-subject"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template-body" className="text-right">
                  Body
                </Label>
                <Textarea
                  id="template-body"
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  className="col-span-3"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={editingTemplate.type}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, type: value })}
                >
                  <SelectTrigger id="template-type" className="col-span-3">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_alert">Price Alert</SelectItem>
                    <SelectItem value="transaction">Transaction</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

