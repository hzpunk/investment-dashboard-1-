// Notification service

// Types of notifications
export type NotificationType = "success" | "error" | "warning" | "info"

// Notification interface
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: Date
}

// In-memory store for notifications (in a real app, this would be in a database)
let notifications: Notification[] = []

// Add a notification
export function addNotification(type: NotificationType, title: string, message: string): Notification {
  const notification: Notification = {
    id: Date.now().toString(),
    type,
    title,
    message,
    read: false,
    createdAt: new Date(),
  }

  notifications = [notification, ...notifications]

  // In a real app, you would also send push notifications, emails, etc.

  return notification
}

// Mark a notification as read
export function markAsRead(id: string): void {
  notifications = notifications.map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification,
  )
}

// Get all notifications
export function getNotifications(): Notification[] {
  return notifications
}

// Get unread notifications
export function getUnreadNotifications(): Notification[] {
  return notifications.filter((notification) => !notification.read)
}

// Clear all notifications
export function clearNotifications(): void {
  notifications = []
}

// Delete a notification
export function deleteNotification(id: string): void {
  notifications = notifications.filter((notification) => notification.id !== id)
}

