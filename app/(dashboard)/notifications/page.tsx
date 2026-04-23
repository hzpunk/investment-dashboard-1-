"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  getNotifications,
  markAsRead,
  clearNotifications,
  deleteNotification,
  type Notification,
} from "@/shared/api/notifications"
import { Bell, Check, Trash2, CheckCheck } from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"
import { formatLocaleDate, formatLocaleTime } from "@/lib/i18n-display"

export default function NotificationsPage() {
  const { t, locale } = useI18n()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Load notifications
    loadNotifications()
  }, [])

  const loadNotifications = () => {
    const allNotifications = getNotifications()
    setNotifications(allNotifications)
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
    loadNotifications()
  }

  const handleMarkAllAsRead = () => {
    notifications.forEach((notification) => {
      if (!notification.read) {
        markAsRead(notification.id)
      }
    })
    loadNotifications()
  }

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id)
    loadNotifications()
  }

  const handleClearAll = () => {
    clearNotifications()
    loadNotifications()
  }

  // Group notifications by date
  const groupedNotifications: Record<string, Notification[]> = {}

  notifications.forEach((notification) => {
    const date = formatLocaleDate(new Date(notification.createdAt), locale)
    if (!groupedNotifications[date]) {
      groupedNotifications[date] = []
    }
    groupedNotifications[date].push(notification)
  })

  return (
    <div className="space-y-6">
      <DashboardHeader heading={t("notifications.title")} text={t("notifications.description")}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={!notifications.some((n) => !n.read)}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {t("actions.markAllRead")}
          </Button>
          <Button variant="outline" onClick={handleClearAll} disabled={notifications.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("actions.clearAll")}
          </Button>
        </div>
      </DashboardHeader>

      <div className="space-y-6">
        {Object.keys(groupedNotifications).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-3">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">{t("notifications.empty")}</h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t("notifications.emptyDescription")}
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="mb-4 text-sm font-medium">{date}</h3>
              <div className="space-y-4">
                {items.map((notification) => (
                  <Card key={notification.id} className={notification.read ? "opacity-70" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 rounded-full p-1 ${getNotificationColor(notification.type)}`}>
                            <Bell className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{notification.title}</h4>
                              {!notification.read && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t("notifications.new")}</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatLocaleTime(new Date(notification.createdAt), locale)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button variant="ghost" size="icon" onClick={() => handleMarkAsRead(notification.id)}>
                              <Check className="h-4 w-4" />
                              <span className="sr-only">{t("actions.markRead")}</span>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteNotification(notification.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t("common.delete")}</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function getNotificationColor(type: string): string {
  switch (type) {
    case "success":
      return "bg-green-100 text-green-500 dark:bg-green-500/20"
    case "error":
      return "bg-red-100 text-red-500 dark:bg-red-500/20"
    case "warning":
      return "bg-yellow-100 text-yellow-500 dark:bg-yellow-500/20"
    default:
      return "bg-blue-100 text-blue-500 dark:bg-blue-500/20"
  }
}

