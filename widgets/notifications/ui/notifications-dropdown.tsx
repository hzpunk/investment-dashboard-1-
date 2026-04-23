"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getNotifications, markAsRead, type Notification } from "@/shared/api/notifications"
import { useI18n } from "@/contexts/i18n-context"
import { formatLocaleTime } from "@/lib/i18n-display"

export function NotificationsDropdown() {
  const { t, locale } = useI18n()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load notifications
    const loadNotifications = () => {
      const allNotifications = getNotifications()
      setNotifications(allNotifications)
      setUnreadCount(allNotifications.filter((n) => !n.read).length)
    }

    loadNotifications()

    // Set up interval to check for new notifications
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleNotificationClick = (id: string) => {
    markAsRead(id)
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">{t("notifications.title")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>{t("notifications.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">{t("notifications.empty")}</div>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start p-3 ${notification.read ? "" : "bg-accent/50"}`}
              onClick={() => handleNotificationClick(notification.id)}
            >
              <div className="flex w-full justify-between">
                <span className="font-medium">{notification.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatLocaleTime(new Date(notification.createdAt), locale)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{notification.message}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center">
          <a href="/notifications" className="w-full text-center text-sm">
            {t("notifications.viewAll")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

