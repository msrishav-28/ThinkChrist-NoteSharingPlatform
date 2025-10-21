import { createClient } from '@/lib/supabase/client'
import { collectionPermissions } from './collection-permissions'
import type { Collection, Notification } from '@/types'

export interface ShareCollectionOptions {
  make_public?: boolean
  enable_collaboration?: boolean
  user_emails?: string[]
  message?: string
}

export interface ShareResult {
  success: boolean
  share_url: string
  shared_with: string[]
  errors: string[]
}

export interface CollectionInvitation {
  collection_id: string
  collection_title: string
  invited_by: string
  invited_by_name: string
  can_collaborate: boolean
  message?: string
}

/**
 * Collection sharing utility class
 */
export class CollectionSharingUtil {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  /**
   * Share a collection with specified options
   */
  async shareCollection(
    collectionId: string,
    userId: string,
    options: ShareCollectionOptions
  ): Promise<ShareResult> {
    const result: ShareResult = {
      success: false,
      share_url: this.getCollectionShareUrl(collectionId),
      shared_with: [],
      errors: []
    }

    try {
      // Check if user has permission to share
      const canShare = await collectionPermissions.canPerformAction(
        collectionId, 
        userId, 
        'can_share'
      )

      if (!canShare) {
        result.errors.push('You do not have permission to share this collection')
        return result
      }

      // Update collection visibility settings
      if (options.make_public !== undefined || options.enable_collaboration !== undefined) {
        await this.updateCollectionVisibility(
          collectionId,
          userId,
          options.make_public,
          options.enable_collaboration
        )
      }

      // Send invitations to specific users
      if (options.user_emails?.length) {
        const invitationResult = await this.sendCollectionInvitations(
          collectionId,
          userId,
          options.user_emails,
          options.enable_collaboration || false,
          options.message
        )

        result.shared_with = invitationResult.successful_emails
        result.errors.push(...invitationResult.errors)
      }

      result.success = result.errors.length === 0
      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred')
      return result
    }
  }

  /**
   * Update collection visibility settings
   */
  private async updateCollectionVisibility(
    collectionId: string,
    userId: string,
    makePublic?: boolean,
    enableCollaboration?: boolean
  ): Promise<void> {
    const updateData: Partial<Collection> = {}

    if (makePublic !== undefined) {
      updateData.is_public = makePublic
    }

    if (enableCollaboration !== undefined) {
      updateData.is_collaborative = enableCollaboration
    }

    if (Object.keys(updateData).length === 0) return

    const { error } = await this.supabase
      .from('collections')
      .update(updateData)
      .eq('id', collectionId)
      .eq('created_by', userId)

    if (error) {
      throw new Error(`Failed to update collection visibility: ${error.message}`)
    }
  }

  /**
   * Send collection invitations to users via email
   */
  private async sendCollectionInvitations(
    collectionId: string,
    invitedBy: string,
    userEmails: string[],
    canCollaborate: boolean,
    message?: string
  ): Promise<{ successful_emails: string[], errors: string[] }> {
    const result = {
      successful_emails: [] as string[],
      errors: [] as string[]
    }

    // Get collection details
    const { data: collection, error: collectionError } = await this.supabase
      .from('collections')
      .select(`
        title,
        creator:created_by(full_name)
      `)
      .eq('id', collectionId)
      .single()

    if (collectionError) {
      result.errors.push('Failed to fetch collection details')
      return result
    }

    // Get users by email
    const { data: users, error: usersError } = await this.supabase
      .from('users')
      .select('id, email, full_name')
      .in('email', userEmails)

    if (usersError) {
      result.errors.push('Failed to fetch user information')
      return result
    }

    // Find emails that don't correspond to existing users
    const foundEmails = users.map(u => u.email)
    const notFoundEmails = userEmails.filter(email => !foundEmails.includes(email))
    
    if (notFoundEmails.length > 0) {
      result.errors.push(`Users not found: ${notFoundEmails.join(', ')}`)
    }

    // Create notifications for existing users
    if (users.length > 0) {
      const notifications: Partial<Notification>[] = users.map(user => ({
        user_id: user.id,
        type: 'collection_shared',
        title: 'Collection Shared With You',
        message: `${(collection.creator as any)?.full_name} shared the collection "${collection.title}" with you`,
        data: {
          collection_id: collectionId,
          collection_title: collection.title,
          invited_by: invitedBy,
          invited_by_name: (collection.creator as any)?.full_name,
          can_collaborate: canCollaborate,
          custom_message: message
        }
      }))

      const { error: notificationError } = await this.supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        result.errors.push('Failed to send notifications to some users')
      } else {
        result.successful_emails = foundEmails
      }
    }

    return result
  }

  /**
   * Get shareable URL for a collection
   */
  getCollectionShareUrl(collectionId: string): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return `${baseUrl}/collections/${collectionId}`
  }

  /**
   * Generate a shareable link with optional access token for private collections
   */
  async generateShareableLink(
    collectionId: string,
    userId: string,
    options?: {
      expires_in_days?: number
      allow_anonymous?: boolean
    }
  ): Promise<string> {
    // For now, return basic URL. In future, could implement temporary access tokens
    const baseUrl = this.getCollectionShareUrl(collectionId)
    
    if (options?.allow_anonymous) {
      // Could add a temporary access token parameter here
      // For now, just return the basic URL
      return baseUrl
    }

    return baseUrl
  }

  /**
   * Get collection invitation details from notification data
   */
  parseCollectionInvitation(notificationData: Record<string, any>): CollectionInvitation | null {
    if (!notificationData.collection_id) return null

    return {
      collection_id: notificationData.collection_id,
      collection_title: notificationData.collection_title || 'Untitled Collection',
      invited_by: notificationData.invited_by,
      invited_by_name: notificationData.invited_by_name || 'Someone',
      can_collaborate: notificationData.can_collaborate || false,
      message: notificationData.custom_message
    }
  }

  /**
   * Accept a collection invitation
   */
  async acceptCollectionInvitation(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean, collection_id?: string, error?: string }> {
    try {
      // Get notification details
      const { data: notification, error: notificationError } = await this.supabase
        .from('notifications')
        .select('data, is_read')
        .eq('id', notificationId)
        .eq('user_id', userId)
        .eq('type', 'collection_shared')
        .single()

      if (notificationError || !notification) {
        return { success: false, error: 'Invitation not found' }
      }

      const invitation = this.parseCollectionInvitation(notification.data)
      if (!invitation) {
        return { success: false, error: 'Invalid invitation data' }
      }

      // Mark notification as read
      await this.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      // Check if collection still exists and is accessible
      const canAccess = await collectionPermissions.canPerformAction(
        invitation.collection_id,
        userId,
        'can_view'
      )

      if (!canAccess) {
        return { 
          success: false, 
          error: 'Collection is no longer accessible or does not exist' 
        }
      }

      return { 
        success: true, 
        collection_id: invitation.collection_id 
      }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  /**
   * Get sharing statistics for a collection
   */
  async getCollectionSharingStats(
    collectionId: string,
    userId: string
  ): Promise<{
    is_public: boolean
    is_collaborative: boolean
    total_notifications_sent: number
    recent_shares: Array<{
      shared_with: string
      shared_at: string
    }>
  }> {
    // Check permissions
    const canView = await collectionPermissions.canPerformAction(
      collectionId,
      userId,
      'can_view'
    )

    if (!canView) {
      throw new Error('Insufficient permissions to view sharing statistics')
    }

    // Get collection visibility settings
    const { data: collection, error: collectionError } = await this.supabase
      .from('collections')
      .select('is_public, is_collaborative')
      .eq('id', collectionId)
      .single()

    if (collectionError) {
      throw new Error('Failed to fetch collection details')
    }

    // Get sharing notifications count
    const { data: notifications, error: notificationsError } = await this.supabase
      .from('notifications')
      .select('created_at, data')
      .eq('type', 'collection_shared')
      .contains('data', { collection_id: collectionId })
      .order('created_at', { ascending: false })
      .limit(10)

    if (notificationsError) {
      throw new Error('Failed to fetch sharing statistics')
    }

    return {
      is_public: collection.is_public,
      is_collaborative: collection.is_collaborative,
      total_notifications_sent: notifications.length,
      recent_shares: notifications.map(n => ({
        shared_with: 'User', // Could enhance to show actual user names
        shared_at: n.created_at
      }))
    }
  }
}

// Export singleton instance
export const collectionSharing = new CollectionSharingUtil()
