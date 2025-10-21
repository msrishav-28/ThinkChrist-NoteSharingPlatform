import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/types'

export interface NotificationFilters {
  unreadOnly?: boolean
  type?: string
  page?: number
  limit?: number
}

export interface NotificationResponse {
  notifications: Notification[]
  totalCount: number
  currentPage: number
  totalPages: number
}

export class NotificationService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationResponse | null> {
    try {
      const params = new URLSearchParams()
      
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.unreadOnly) params.append('unread_only', 'true')
      if (filters.type) params.append('type', filters.type)

      const response = await fetch(`/api/notifications?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return null
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.getNotifications({ unreadOnly: true, limit: 1 })
      return response?.totalCount || 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_read: true }),
      })

      return response.ok
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  async markAllAsRead(): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })

      return response.ok
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      })

      return response.ok
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  async createNotification(notification: {
    type: string
    title: string
    message?: string
    data?: Record<string, any>
    target_user_id?: string
  }): Promise<Notification | null> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  // Real-time notification subscription
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const channel = this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }

  // Helper methods for creating specific notification types
  async notifyAchievement(userId: string, achievementTitle: string, points: number) {
    return this.createNotification({
      type: 'achievement',
      title: 'New Achievement Unlocked!',
      message: `You've earned the "${achievementTitle}" achievement and gained ${points} points!`,
      data: { achievement: achievementTitle, points },
      target_user_id: userId
    })
  }

  async notifyVoteReceived(userId: string, resourceTitle: string, voteType: 'upvote' | 'downvote') {
    return this.createNotification({
      type: 'vote_received',
      title: `Your resource received ${voteType === 'upvote' ? 'an upvote' : 'a downvote'}`,
      message: `"${resourceTitle}" was ${voteType === 'upvote' ? 'upvoted' : 'downvoted'} by another user.`,
      data: { resource_title: resourceTitle, vote_type: voteType },
      target_user_id: userId
    })
  }

  async notifyNewResource(userId: string, resourceTitle: string, department: string, course: string) {
    return this.createNotification({
      type: 'new_resource',
      title: 'New Resource Available',
      message: `A new resource "${resourceTitle}" has been uploaded in ${department} - ${course}.`,
      data: { resource_title: resourceTitle, department, course },
      target_user_id: userId
    })
  }

  async notifyCollectionShared(userId: string, collectionTitle: string, sharedBy: string) {
    return this.createNotification({
      type: 'collection_shared',
      title: 'Collection Shared With You',
      message: `${sharedBy} shared the collection "${collectionTitle}" with you.`,
      data: { collection_title: collectionTitle, shared_by: sharedBy },
      target_user_id: userId
    })
  }
}

export const notificationService = new NotificationService()
