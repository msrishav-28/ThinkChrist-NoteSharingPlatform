'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { collaborativeCollectionService } from '@/lib/services/collaborative-collection-service'
import type { Collection, CollectionResource } from '@/types'
import type { 
  CollaborationActivity, 
  ActiveCollaborator 
} from '@/lib/services/collaborative-collection-service'
import { useAuth } from './use-auth'

interface UseCollectionCollaborationOptions {
  collectionId: string
  enableRealTimeUpdates?: boolean
  enablePresenceTracking?: boolean
}

interface CollaborationState {
  collection: Collection | null
  activities: CollaborationActivity[]
  activeCollaborators: ActiveCollaborator[]
  isConnected: boolean
  canCollaborate: boolean
  loading: boolean
  error: string | null
}

export function useCollectionCollaboration({
  collectionId,
  enableRealTimeUpdates = true,
  enablePresenceTracking = true
}: UseCollectionCollaborationOptions) {
  const { user } = useAuth()
  const [state, setState] = useState<CollaborationState>({
    collection: null,
    activities: [],
    activeCollaborators: [],
    isConnected: false,
    canCollaborate: false,
    loading: true,
    error: null
  })

  const subscriptionRef = useRef<any>(null)
  const presenceChannelRef = useRef<any>(null)

  // Update collection data
  const updateCollection = useCallback((collection: Collection) => {
    setState(prev => ({ ...prev, collection }))
  }, [])

  // Handle resource added
  const handleResourceAdded = useCallback((resource: CollectionResource) => {
    setState(prev => ({
      ...prev,
      collection: prev.collection ? {
        ...prev.collection,
        resources: [...(prev.collection.resources || []), resource]
      } : null
    }))
  }, [])

  // Handle resource removed
  const handleResourceRemoved = useCallback((resourceId: string) => {
    setState(prev => ({
      ...prev,
      collection: prev.collection ? {
        ...prev.collection,
        resources: prev.collection.resources?.filter(r => r.resource_id !== resourceId) || []
      } : null
    }))
  }, [])

  // Handle resource reordered
  const handleResourceReordered = useCallback((resources: CollectionResource[]) => {
    setState(prev => ({
      ...prev,
      collection: prev.collection ? {
        ...prev.collection,
        resources
      } : null
    }))
  }, [])

  // Handle activity update
  const handleActivityUpdate = useCallback((activity: CollaborationActivity) => {
    setState(prev => ({
      ...prev,
      activities: [activity, ...prev.activities.slice(0, 49)] // Keep last 50 activities
    }))
  }, [])

  // Handle collaborator update
  const handleCollaboratorUpdate = useCallback((collaborators: ActiveCollaborator[]) => {
    setState(prev => ({ ...prev, activeCollaborators: collaborators }))
  }, [])

  // Initialize collaboration
  useEffect(() => {
    if (!collectionId || !user) return

    const initializeCollaboration = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))

        // Check if user can collaborate
        const canCollaborate = await collaborativeCollectionService.canUserCollaborate(
          collectionId, 
          user.id
        )

        // Load initial data
        const [activities, collaborators] = await Promise.all([
          collaborativeCollectionService.getCollaborationActivity(collectionId),
          collaborativeCollectionService.getActiveCollaborators(collectionId)
        ])

        setState(prev => ({
          ...prev,
          canCollaborate,
          activities,
          activeCollaborators: collaborators,
          loading: false,
          isConnected: true
        }))

        // Set up real-time subscriptions
        if (enableRealTimeUpdates && canCollaborate) {
          subscriptionRef.current = collaborativeCollectionService.subscribeToCollectionUpdates(
            collectionId,
            {
              onCollectionUpdate: updateCollection,
              onResourceAdded: handleResourceAdded,
              onResourceRemoved: handleResourceRemoved,
              onResourceReordered: handleResourceReordered,
              onActivityUpdate: handleActivityUpdate,
              onCollaboratorUpdate: handleCollaboratorUpdate
            }
          )
        }

        // Set up presence tracking
        if (enablePresenceTracking && canCollaborate) {
          presenceChannelRef.current = await collaborativeCollectionService.trackUserPresence(
            collectionId,
            user.id
          )
        }

      } catch (error) {
        console.error('Error initializing collaboration:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize collaboration'
        }))
      }
    }

    initializeCollaboration()

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        collaborativeCollectionService.unsubscribeFromCollectionUpdates(collectionId)
      }
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe()
      }
    }
  }, [
    collectionId, 
    user?.id, 
    enableRealTimeUpdates, 
    enablePresenceTracking,
    updateCollection,
    handleResourceAdded,
    handleResourceRemoved,
    handleResourceReordered,
    handleActivityUpdate,
    handleCollaboratorUpdate
  ])

  // Log activity
  const logActivity = useCallback(async (
    activityType: CollaborationActivity['activity_type'],
    activityData: Record<string, any> = {}
  ) => {
    if (!user || !state.canCollaborate) return

    try {
      await collaborativeCollectionService.logCollaborationActivity(
        collectionId,
        user.id,
        activityType,
        activityData
      )
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }, [collectionId, user?.id, state.canCollaborate])

  // Send collaboration invitation
  const sendInvitation = useCallback(async (
    userEmail: string,
    permissionLevel: 'view' | 'edit' | 'admin' = 'edit',
    message?: string
  ) => {
    if (!user) throw new Error('User not authenticated')

    return await collaborativeCollectionService.sendCollaborationInvitation(
      collectionId,
      user.id,
      userEmail,
      permissionLevel,
      message
    )
  }, [collectionId, user?.id])

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string) => {
    if (!user) throw new Error('User not authenticated')

    return await collaborativeCollectionService.acceptCollaborationInvitation(
      invitationId,
      user.id
    )
  }, [user?.id])

  // Decline invitation
  const declineInvitation = useCallback(async (invitationId: string) => {
    if (!user) throw new Error('User not authenticated')

    return await collaborativeCollectionService.declineCollaborationInvitation(
      invitationId,
      user.id
    )
  }, [user?.id])

  // Get user invitations
  const getUserInvitations = useCallback(async () => {
    if (!user) return []

    return await collaborativeCollectionService.getUserCollaborationInvitations(user.id)
  }, [user?.id])

  return {
    // State
    ...state,
    
    // Actions
    logActivity,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    getUserInvitations,
    
    // Utilities
    refresh: async () => {
      if (!user) return
      
      try {
        const [activities, collaborators] = await Promise.all([
          collaborativeCollectionService.getCollaborationActivity(collectionId),
          collaborativeCollectionService.getActiveCollaborators(collectionId)
        ])
        
        setState(prev => ({
          ...prev,
          activities,
          activeCollaborators: collaborators
        }))
      } catch (error) {
        console.error('Error refreshing collaboration data:', error)
      }
    }
  }
}

// Hook for managing collaboration invitations
export function useCollaborationInvitations() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadInvitations = async () => {
      try {
        const userInvitations = await collaborativeCollectionService.getUserCollaborationInvitations(user.id)
        setInvitations(userInvitations)
      } catch (error) {
        console.error('Error loading invitations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInvitations()
  }, [user?.id])

  const acceptInvitation = useCallback(async (invitationId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' }

    const result = await collaborativeCollectionService.acceptCollaborationInvitation(
      invitationId,
      user.id
    )

    if (result.success) {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    }

    return result
  }, [user?.id])

  const declineInvitation = useCallback(async (invitationId: string) => {
    if (!user) return false

    const success = await collaborativeCollectionService.declineCollaborationInvitation(
      invitationId,
      user.id
    )

    if (success) {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    }

    return success
  }, [user?.id])

  return {
    invitations,
    loading,
    acceptInvitation,
    declineInvitation,
    refresh: async () => {
      if (!user) return
      
      try {
        const userInvitations = await collaborativeCollectionService.getUserCollaborationInvitations(user.id)
        setInvitations(userInvitations)
      } catch (error) {
        console.error('Error refreshing invitations:', error)
      }
    }
  }
}