import { useState, useEffect, useCallback } from 'react'
import { Notification } from '@/types'
import { notificationService, NotificationFilters } from '@/lib/services/notification-service'
import { useAuth } from '@/features/auth'

export function useNotifications(filters: NotificationFilters = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await notificationService.getNotifications(filters)
      if (response) {
        setNotifications(response.notifications)
        setTotalCount(response.totalCount)
        setCurrentPage(response.currentPage)
        setTotalPages(response.totalPages)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to load unread count:', err)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [loadNotifications, loadUnreadCount])

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        setTotalCount(prev => prev + 1)
      }
    )

    return unsubscribe
  }, [user?.id])

  const markAsRead = async (notificationId: string) => {
    try {
      const success = await notificationService.markAsRead(notificationId)
      if (success) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
      return false
    }
  }

  const markAllAsRead = async () => {
    try {
      const success = await notificationService.markAllAsRead()
      if (success) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, is_read: true }))
        )
        setUnreadCount(0)
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
      return false
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const success = await notificationService.deleteNotification(notificationId)
      if (success) {
        const notification = notifications.find(n => n.id === notificationId)
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        setTotalCount(prev => prev - 1)
        
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
      return false
    }
  }

  return {
    notifications,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: loadNotifications,
    refetchUnreadCount: loadUnreadCount
  }
}