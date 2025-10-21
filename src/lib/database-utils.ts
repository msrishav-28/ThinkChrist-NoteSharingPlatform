import { createClient } from './supabase/client'
import type { 
  Resource, 
  Collection, 
  UserPreferences, 
  UserInteraction, 
  Notification,
  CollectionResource 
} from '@/types'

// Database utility functions for enhanced schema operations

export class DatabaseUtils {
  // Resource operations with enhanced schema
  static async createResource(resourceData: Partial<Resource>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single()
    
    if (error) throw error
    return data as Resource
  }

  static async updateResourceMetadata(
    resourceId: string, 
    metadata: {
      link_preview?: any
      content_metadata?: Record<string, any>
      tags?: string[]
      estimated_time?: number
      difficulty_level?: string
    }
  ) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('resources')
      .update(metadata)
      .eq('id', resourceId)
      .select()
      .single()
    
    if (error) throw error
    return data as Resource
  }

  // Collection operations - Enhanced with permissions and sharing
  static async createCollection(collectionData: Partial<Collection>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('collections')
      .insert([collectionData])
      .select(`
        *,
        creator:created_by(id, full_name, department)
      `)
      .single()
    
    if (error) throw error
    return data as Collection
  }

  static async updateCollection(
    collectionId: string, 
    updateData: Partial<Collection>,
    userId: string
  ) {
    const supabase = createClient()
    
    // Verify user has permission to update
    const { data: collection, error: permError } = await supabase
      .from('collections')
      .select('created_by, is_collaborative')
      .eq('id', collectionId)
      .single()
    
    if (permError) throw permError
    
    const canEdit = collection.created_by === userId || collection.is_collaborative
    if (!canEdit) {
      throw new Error('Insufficient permissions to update collection')
    }

    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', collectionId)
      .select(`
        *,
        creator:created_by(id, full_name, department)
      `)
      .single()
    
    if (error) throw error
    return data as Collection
  }

  static async deleteCollection(collectionId: string, userId: string) {
    const supabase = createClient()
    
    // Only collection owner can delete
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('created_by', userId)
    
    if (error) throw error
  }

  static async addResourceToCollection(
    collectionId: string, 
    resourceId: string, 
    userId: string,
    orderIndex?: number,
    notes?: string
  ) {
    const supabase = createClient()
    
    // Check permissions
    const { data: collection, error: permError } = await supabase
      .from('collections')
      .select('created_by, is_collaborative, is_public')
      .eq('id', collectionId)
      .single()
    
    if (permError) throw permError
    
    const canEdit = collection.created_by === userId || 
                   (collection.is_collaborative && (collection.is_public || collection.created_by === userId))
    if (!canEdit) {
      throw new Error('Insufficient permissions to add resources to collection')
    }

    // Get next order index if not provided
    if (orderIndex === undefined) {
      const { data: lastResource } = await supabase
        .from('collection_resources')
        .select('order_index')
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      
      orderIndex = (lastResource?.order_index || 0) + 1
    }

    const { data, error } = await supabase
      .from('collection_resources')
      .insert([{
        collection_id: collectionId,
        resource_id: resourceId,
        order_index: orderIndex,
        notes
      }])
      .select(`
        *,
        resource:resources(
          *,
          uploader:uploaded_by(id, full_name, department)
        )
      `)
      .single()
    
    if (error) throw error
    return data as CollectionResource
  }

  static async removeResourceFromCollection(
    collectionId: string,
    resourceId: string,
    userId: string
  ) {
    const supabase = createClient()
    
    // Check permissions
    const { data: collection, error: permError } = await supabase
      .from('collections')
      .select('created_by, is_collaborative')
      .eq('id', collectionId)
      .single()
    
    if (permError) throw permError
    
    const canEdit = collection.created_by === userId || collection.is_collaborative
    if (!canEdit) {
      throw new Error('Insufficient permissions to remove resources from collection')
    }

    const { error } = await supabase
      .from('collection_resources')
      .delete()
      .eq('collection_id', collectionId)
      .eq('resource_id', resourceId)
    
    if (error) throw error
  }

  static async reorderCollectionResources(
    collectionId: string,
    resourceOrders: { resource_id: string, order_index: number }[],
    userId: string
  ) {
    const supabase = createClient()
    
    // Check permissions
    const { data: collection, error: permError } = await supabase
      .from('collections')
      .select('created_by, is_collaborative')
      .eq('id', collectionId)
      .single()
    
    if (permError) throw permError
    
    const canEdit = collection.created_by === userId || collection.is_collaborative
    if (!canEdit) {
      throw new Error('Insufficient permissions to reorder collection resources')
    }

    // Update each resource's order
    const updates = resourceOrders.map(({ resource_id, order_index }) => ({
      collection_id: collectionId,
      resource_id,
      order_index
    }))

    const { error } = await supabase
      .from('collection_resources')
      .upsert(updates, { onConflict: 'collection_id,resource_id' })
    
    if (error) throw error
  }

  static async getCollectionWithResources(collectionId: string, userId?: string) {
    const supabase = createClient()
    
    let query = supabase
      .from('collections')
      .select(`
        *,
        creator:created_by(id, full_name, department),
        resources:collection_resources(
          *,
          resource:resources(
            *,
            uploader:uploaded_by(id, full_name, department)
          )
        )
      `)
      .eq('id', collectionId)

    // Apply RLS - user can see public collections or their own
    if (userId) {
      query = query.or(`is_public.eq.true,created_by.eq.${userId}`)
    } else {
      query = query.eq('is_public', true)
    }
    
    const { data, error } = await query.single()
    
    if (error) throw error
    
    // Sort resources by order_index
    if (data.resources) {
      data.resources.sort((a: any, b: any) => a.order_index - b.order_index)
    }
    
    return data
  }

  static async getUserCollections(userId: string, includePrivate: boolean = true) {
    const supabase = createClient()
    
    let query = supabase
      .from('collections')
      .select(`
        *,
        creator:created_by(id, full_name, department),
        resources:collection_resources(count)
      `)

    if (includePrivate) {
      query = query.eq('created_by', userId)
    } else {
      query = query.or(`created_by.eq.${userId},is_public.eq.true`)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Collection[]
  }

  static async shareCollection(
    collectionId: string,
    shareSettings: {
      is_public?: boolean
      is_collaborative?: boolean
      notify_users?: string[] // user emails to notify
    },
    userId: string
  ) {
    const supabase = createClient()
    
    // Only owner can share
    const updateData: Partial<Collection> = {}
    if (shareSettings.is_public !== undefined) {
      updateData.is_public = shareSettings.is_public
    }
    if (shareSettings.is_collaborative !== undefined) {
      updateData.is_collaborative = shareSettings.is_collaborative
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', collectionId)
        .eq('created_by', userId)
      
      if (error) throw error
    }

    // Send notifications to specified users
    if (shareSettings.notify_users?.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('email', shareSettings.notify_users)

      if (users?.length) {
        const notifications = users.map(user => ({
          user_id: user.id,
          type: 'collection_shared' as const,
          title: 'Collection Shared With You',
          message: 'A collection has been shared with you',
          data: { collection_id: collectionId, shared_by: userId }
        }))

        await supabase.from('notifications').insert(notifications)
      }
    }
  }

  // User preferences operations
  static async getUserPreferences(userId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    return data as UserPreferences
  }

  static async updateUserPreferences(
    userId: string, 
    preferences: Partial<UserPreferences>
  ) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data as UserPreferences
  }

  // User interaction tracking
  static async trackUserInteraction(
    userId: string,
    resourceId: string,
    interactionType: UserInteraction['interaction_type'],
    interactionData: Record<string, any> = {}
  ) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_interactions')
      .insert([{
        user_id: userId,
        resource_id: resourceId,
        interaction_type: interactionType,
        interaction_data: interactionData
      }])
      .select()
      .single()
    
    if (error) throw error
    return data as UserInteraction
  }

  // Notification operations
  static async createNotification(notificationData: Partial<Notification>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single()
    
    if (error) throw error
    return data as Notification
  }

  static async getUserNotifications(userId: string, limit: number = 50) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as Notification[]
  }

  static async markNotificationAsRead(notificationId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()
    
    if (error) throw error
    return data as Notification
  }

  // Enhanced search operations
  static async searchResources(
    query: string,
    filters: {
      resourceTypes?: string[]
      departments?: string[]
      courses?: string[]
      tags?: string[]
      difficulty?: string[]
    } = {},
    limit: number = 20,
    offset: number = 0
  ) {
    const supabase = createClient()
    let queryBuilder = supabase
      .from('resources')
      .select(`
        *,
        uploader:uploaded_by(full_name, department)
      `)

    // Add text search
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Add filters
    if (filters.resourceTypes?.length) {
      queryBuilder = queryBuilder.in('resource_type', filters.resourceTypes)
    }
    if (filters.departments?.length) {
      queryBuilder = queryBuilder.in('department', filters.departments)
    }
    if (filters.courses?.length) {
      queryBuilder = queryBuilder.in('course', filters.courses)
    }
    if (filters.tags?.length) {
      queryBuilder = queryBuilder.overlaps('tags', filters.tags)
    }
    if (filters.difficulty?.length) {
      queryBuilder = queryBuilder.in('difficulty_level', filters.difficulty)
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data as Resource[]
  }

  // Get resources by specific tags
  static async getResourcesByTags(
    tags: string[],
    filters: {
      department?: string
      course?: string
      resourceTypes?: string[]
    } = {},
    limit: number = 20
  ) {
    const supabase = createClient()
    let queryBuilder = supabase
      .from('resources')
      .select(`
        *,
        uploader:uploaded_by(full_name, department)
      `)
      .overlaps('tags', tags)

    // Add additional filters
    if (filters.department) {
      queryBuilder = queryBuilder.eq('department', filters.department)
    }
    if (filters.course) {
      queryBuilder = queryBuilder.eq('course', filters.course)
    }
    if (filters.resourceTypes?.length) {
      queryBuilder = queryBuilder.in('resource_type', filters.resourceTypes)
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as Resource[]
  }

  // Analytics and reporting
  static async getResourceAnalytics(resourceId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_interactions')
      .select('interaction_type, created_at')
      .eq('resource_id', resourceId)
    
    if (error) throw error
    return data
  }

  static async getUserActivitySummary(userId: string, days: number = 30) {
    const supabase = createClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('user_interactions')
      .select('interaction_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
    
    if (error) throw error
    return data
  }
}