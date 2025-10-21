import { createClient } from '@/lib/supabase/client'
import { collectionService } from './collection-service'
import type { Collection, CollectionResource, User } from '@/types'

export interface CollaborationActivity {
  id: string
  collection_id: string
  user_id: string
  user_name: string
  activity_type: 'resource_added' | 'resource_removed' | 'resource_reordered' | 'collection_updated' | 'user_joined' | 'notes_updated'
  activity_data: Record<string, any>
  created_at: string
}

export interface ActiveCollaborator {
  user_id: string
  user_name: string
  last_seen: string
  is_online: boolean
}

export interface CollaborationInvitation {
  id: string
  collection_id: string
  invited_by: string
  invited_user_email: string
  invited_user_id?: string
  permission_level: 'view' | 'edit' | 'admin'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  expires_at: string
}

/**
 * Service for handling collaborative collection features
 */
export class CollaborativeCollectionService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }
  private activeSubscriptions = new Map<string, any>()

  /**
   * Subscribe to real-time collection updates
   */
  subscribeToCollectionUpdates(
    collectionId: string,
    callbacks: {
      onCollectionUpdate?: (collection: Collection) => void
      onResourceAdded?: (resource: CollectionResource) => void
      onResourceRemoved?: (resourceId: string) => void
      onResourceReordered?: (resources: CollectionResource[]) => void
      onActivityUpdate?: (activity: CollaborationActivity) => void
      onCollaboratorUpdate?: (collaborators: ActiveCollaborator[]) => void
    }
  ) {
    // Subscribe to collection changes
    const collectionSubscription = this.supabase
      .channel(`collection:${collectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections',
          filter: `id=eq.${collectionId}`
        },
        async (payload) => {
          if (callbacks.onCollectionUpdate) {
            const updatedCollection = await collectionService.getCollectionById(collectionId)
            if (updatedCollection) {
              callbacks.onCollectionUpdate(updatedCollection)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collection_resources',
          filter: `collection_id=eq.${collectionId}`
        },
        async (payload) => {
          if (callbacks.onResourceAdded) {
            // Fetch the full resource data
            const { data: resourceData } = await this.supabase
              .from('collection_resources')
              .select(`
                *,
                resource:resources(
                  *,
                  uploader:uploaded_by(id, full_name, department)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (resourceData) {
              callbacks.onResourceAdded(resourceData as CollectionResource)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'collection_resources',
          filter: `collection_id=eq.${collectionId}`
        },
        (payload) => {
          if (callbacks.onResourceRemoved) {
            callbacks.onResourceRemoved(payload.old.resource_id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collection_resources',
          filter: `collection_id=eq.${collectionId}`
        },
        async (payload) => {
          if (callbacks.onResourceReordered) {
            // Fetch updated resource order
            const updatedCollection = await collectionService.getCollectionById(collectionId)
            if (updatedCollection?.resources) {
              callbacks.onResourceReordered(updatedCollection.resources)
            }
          }
        }
      )
      .subscribe()

    this.activeSubscriptions.set(collectionId, collectionSubscription)
    return collectionSubscription
  }

  /**
   * Unsubscribe from collection updates
   */
  unsubscribeFromCollectionUpdates(collectionId: string) {
    const subscription = this.activeSubscriptions.get(collectionId)
    if (subscription) {
      this.supabase.removeChannel(subscription)
      this.activeSubscriptions.delete(collectionId)
    }
  }

  /**
   * Track user presence in a collection
   */
  async trackUserPresence(collectionId: string, userId: string) {
    const channel = this.supabase.channel(`presence:collection:${collectionId}`)
    
    await channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        // Handle presence updates
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle user joining
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle user leaving
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    return channel
  }

  /**
   * Send collaboration invitation
   */
  async sendCollaborationInvitation(
    collectionId: string,
    invitedByUserId: string,
    invitedUserEmail: string,
    permissionLevel: 'view' | 'edit' | 'admin' = 'edit',
    message?: string
  ): Promise<CollaborationInvitation> {
    // Check if user exists
    const { data: invitedUser } = await this.supabase
      .from('users')
      .select('id, full_name')
      .eq('email', invitedUserEmail)
      .single()

    // Create invitation
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const { data: invitation, error } = await this.supabase
      .from('collaboration_invitations')
      .insert([{
        collection_id: collectionId,
        invited_by: invitedByUserId,
        invited_user_email: invitedUserEmail,
        invited_user_id: invitedUser?.id,
        permission_level: permissionLevel,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    // Send notification if user exists
    if (invitedUser) {
      const { data: collection } = await this.supabase
        .from('collections')
        .select('title, creator:created_by(full_name)')
        .eq('id', collectionId)
        .single()

      await this.supabase
        .from('notifications')
        .insert([{
          user_id: invitedUser.id,
          type: 'collection_shared',
          title: 'Collaboration Invitation',
          message: `You've been invited to collaborate on "${collection?.title}"`,
          data: {
            collection_id: collectionId,
            invitation_id: invitation.id,
            permission_level: permissionLevel,
            invited_by: invitedByUserId,
            custom_message: message
          }
        }])
    }

    return invitation as CollaborationInvitation
  }

  /**
   * Accept collaboration invitation
   */
  async acceptCollaborationInvitation(
    invitationId: string,
    userId: string
  ): Promise<{ success: boolean, collection_id?: string, error?: string }> {
    try {
      // Get invitation details
      const { data: invitation, error: invitationError } = await this.supabase
        .from('collaboration_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .single()

      if (invitationError || !invitation) {
        return { success: false, error: 'Invitation not found or already processed' }
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await this.supabase
          .from('collaboration_invitations')
          .update({ status: 'expired' })
          .eq('id', invitationId)

        return { success: false, error: 'Invitation has expired' }
      }

      // Update invitation status
      await this.supabase
        .from('collaboration_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)

      // Add user as collaborator (this would require a collaborators table)
      // For now, we'll just ensure the collection is collaborative
      await this.supabase
        .from('collections')
        .update({ is_collaborative: true })
        .eq('id', invitation.collection_id)

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
   * Decline collaboration invitation
   */
  async declineCollaborationInvitation(invitationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('collaboration_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId)
        .eq('invited_user_id', userId)

      return !error
    } catch (error) {
      return false
    }
  }

  /**
   * Get collaboration invitations for a user
   */
  async getUserCollaborationInvitations(userId: string): Promise<CollaborationInvitation[]> {
    const { data: invitations, error } = await this.supabase
      .from('collaboration_invitations')
      .select(`
        *,
        collection:collections(title, creator:created_by(full_name)),
        inviter:invited_by(full_name)
      `)
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return invitations as CollaborationInvitation[]
  }

  /**
   * Get active collaborators for a collection
   */
  async getActiveCollaborators(collectionId: string): Promise<ActiveCollaborator[]> {
    // This would require a more sophisticated presence tracking system
    // For now, return users who have recently interacted with the collection
    const { data: interactions, error } = await this.supabase
      .from('user_interactions')
      .select(`
        user_id,
        created_at,
        user:users(full_name)
      `)
      .in('resource_id', 
        await this.supabase
          .from('collection_resources')
          .select('resource_id')
          .eq('collection_id', collectionId)
          .then(({ data }) => data?.map(cr => cr.resource_id) || [])
      )
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    if (error) return []

    // Group by user and get most recent activity
    const collaboratorMap = new Map<string, ActiveCollaborator>()
    
    interactions?.forEach(interaction => {
      if (!collaboratorMap.has(interaction.user_id)) {
        collaboratorMap.set(interaction.user_id, {
          user_id: interaction.user_id,
          user_name: (interaction.user as any)?.full_name || 'Unknown User',
          last_seen: interaction.created_at,
          is_online: new Date(interaction.created_at) > new Date(Date.now() - 5 * 60 * 1000) // Online if active in last 5 minutes
        })
      }
    })

    return Array.from(collaboratorMap.values())
  }

  /**
   * Log collaboration activity
   */
  async logCollaborationActivity(
    collectionId: string,
    userId: string,
    activityType: CollaborationActivity['activity_type'],
    activityData: Record<string, any> = {}
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single()

    await this.supabase
      .from('collaboration_activities')
      .insert([{
        collection_id: collectionId,
        user_id: userId,
        user_name: user?.full_name || 'Unknown User',
        activity_type: activityType,
        activity_data: activityData
      }])
  }

  /**
   * Get collaboration activity history
   */
  async getCollaborationActivity(
    collectionId: string,
    limit: number = 50
  ): Promise<CollaborationActivity[]> {
    const { data: activities, error } = await this.supabase
      .from('collaboration_activities')
      .select('*')
      .eq('collection_id', collectionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return activities as CollaborationActivity[]
  }

  /**
   * Check if user can collaborate on collection
   */
  async canUserCollaborate(collectionId: string, userId: string): Promise<boolean> {
    const { data: collection } = await this.supabase
      .from('collections')
      .select('created_by, is_collaborative, is_public')
      .eq('id', collectionId)
      .single()

    if (!collection) return false

    // Owner can always collaborate
    if (collection.created_by === userId) return true

    // Check if collection allows collaboration
    if (!collection.is_collaborative) return false

    // For public collaborative collections, any authenticated user can collaborate
    if (collection.is_public) return true

    // For private collaborative collections, check if user has been invited
    const { data: invitation } = await this.supabase
      .from('collaboration_invitations')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('invited_user_id', userId)
      .eq('status', 'accepted')
      .single()

    return !!invitation
  }

  /**
   * Cleanup expired invitations
   */
  async cleanupExpiredInvitations(): Promise<void> {
    await this.supabase
      .from('collaboration_invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
  }
}

// Export singleton instance
export const collaborativeCollectionService = new CollaborativeCollectionService()
