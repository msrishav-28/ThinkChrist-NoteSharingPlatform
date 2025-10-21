import { createClient } from '@/lib/supabase/client'
import type { 
  Collection, 
  CollectionResource, 
  Resource,
  User 
} from '@/types'

export interface CreateCollectionData {
  title: string
  description?: string
  is_public?: boolean
  is_collaborative?: boolean
  tags?: string[]
}

export interface UpdateCollectionData {
  title?: string
  description?: string
  is_public?: boolean
  is_collaborative?: boolean
  tags?: string[]
}

export interface CollectionPermissions {
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_add_resources: boolean
  can_remove_resources: boolean
  can_reorder: boolean
  can_share: boolean
}

export interface ShareCollectionData {
  collection_id: string
  user_emails?: string[]
  make_public?: boolean
  allow_collaboration?: boolean
}

export class CollectionService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  /**
   * Create a new collection
   */
  async createCollection(data: CreateCollectionData, userId: string): Promise<Collection> {
    const { data: collection, error } = await this.supabase
      .from('collections')
      .insert([{
        ...data,
        created_by: userId,
        is_public: data.is_public ?? false,
        is_collaborative: data.is_collaborative ?? false,
        tags: data.tags ?? []
      }])
      .select(`
        *,
        creator:created_by(id, full_name, department)
      `)
      .single()

    if (error) throw error
    return collection as Collection
  }

  /**
   * Get collection by ID with full details
   */
  async getCollectionById(collectionId: string): Promise<Collection | null> {
    const { data: collection, error } = await this.supabase
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
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    // Sort resources by order_index
    if (collection.resources) {
      collection.resources.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return collection as Collection
  }

  /**
   * Get collections by user ID
   */
  async getCollectionsByUser(
    userId: string, 
    includePrivate: boolean = false
  ): Promise<Collection[]> {
    let query = this.supabase
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

    const { data: collections, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return collections as Collection[]
  }

  /**
   * Get public collections with pagination
   */
  async getPublicCollections(
    limit: number = 20,
    offset: number = 0,
    filters?: {
      tags?: string[]
      department?: string
      search?: string
    }
  ): Promise<{ collections: Collection[], total: number }> {
    let query = this.supabase
      .from('collections')
      .select(`
        *,
        creator:created_by(id, full_name, department),
        resources:collection_resources(count)
      `, { count: 'exact' })
      .eq('is_public', true)

    // Apply filters
    if (filters?.tags?.length) {
      query = query.overlaps('tags', filters.tags)
    }

    if (filters?.department) {
      query = query.eq('creator.department', filters.department)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data: collections, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return { 
      collections: collections as Collection[], 
      total: count || 0 
    }
  }

  /**
   * Update collection
   */
  async updateCollection(
    collectionId: string, 
    data: UpdateCollectionData,
    userId: string
  ): Promise<Collection> {
    // Check permissions first
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_edit) {
      throw new Error('Insufficient permissions to edit this collection')
    }

    const { data: collection, error } = await this.supabase
      .from('collections')
      .update(data)
      .eq('id', collectionId)
      .select(`
        *,
        creator:created_by(id, full_name, department)
      `)
      .single()

    if (error) throw error
    return collection as Collection
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId: string, userId: string): Promise<void> {
    // Check permissions first
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_delete) {
      throw new Error('Insufficient permissions to delete this collection')
    }

    const { error } = await this.supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)

    if (error) throw error
  }

  /**
   * Add resource to collection
   */
  async addResourceToCollection(
    collectionId: string,
    resourceId: string,
    userId: string,
    options?: {
      order_index?: number
      notes?: string
    }
  ): Promise<CollectionResource> {
    // Check permissions
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_add_resources) {
      throw new Error('Insufficient permissions to add resources to this collection')
    }

    // Get the next order index if not provided
    let orderIndex = options?.order_index
    if (orderIndex === undefined) {
      const { data: lastResource } = await this.supabase
        .from('collection_resources')
        .select('order_index')
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      orderIndex = (lastResource?.order_index || 0) + 1
    }

    const { data: collectionResource, error } = await this.supabase
      .from('collection_resources')
      .insert([{
        collection_id: collectionId,
        resource_id: resourceId,
        order_index: orderIndex,
        notes: options?.notes
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
    return collectionResource as CollectionResource
  }

  /**
   * Remove resource from collection
   */
  async removeResourceFromCollection(
    collectionId: string,
    resourceId: string,
    userId: string
  ): Promise<void> {
    // Check permissions
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_remove_resources) {
      throw new Error('Insufficient permissions to remove resources from this collection')
    }

    const { error } = await this.supabase
      .from('collection_resources')
      .delete()
      .eq('collection_id', collectionId)
      .eq('resource_id', resourceId)

    if (error) throw error
  }

  /**
   * Reorder resources in collection
   */
  async reorderCollectionResources(
    collectionId: string,
    resourceIds: string[],
    userId: string
  ): Promise<void> {
    // Check permissions
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_reorder) {
      throw new Error('Insufficient permissions to reorder resources in this collection')
    }

    // Update order_index for each resource
    const updates = resourceIds.map((resourceId, index) => ({
      collection_id: collectionId,
      resource_id: resourceId,
      order_index: index
    }))

    // Use upsert to update order_index
    const { error } = await this.supabase
      .from('collection_resources')
      .upsert(updates, {
        onConflict: 'collection_id,resource_id'
      })

    if (error) throw error
  }

  /**
   * Get collection permissions for a user
   */
  async getCollectionPermissions(
    collectionId: string, 
    userId: string
  ): Promise<CollectionPermissions> {
    const { data: collection, error } = await this.supabase
      .from('collections')
      .select('created_by, is_public, is_collaborative')
      .eq('id', collectionId)
      .single()

    if (error) {
      throw error
    }

    const isOwner = collection.created_by === userId
    const canView = collection.is_public || isOwner
    const canEdit = isOwner || (collection.is_collaborative && canView)

    return {
      can_view: canView,
      can_edit: canEdit,
      can_delete: isOwner,
      can_add_resources: canEdit,
      can_remove_resources: canEdit,
      can_reorder: canEdit,
      can_share: isOwner
    }
  }

  /**
   * Share collection with users
   */
  async shareCollection(
    collectionId: string,
    shareData: ShareCollectionData,
    userId: string
  ): Promise<{ success: boolean, shared_with: string[] }> {
    // Check permissions
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_share) {
      throw new Error('Insufficient permissions to share this collection')
    }

    const sharedWith: string[] = []

    // Update collection visibility if requested
    if (shareData.make_public !== undefined || shareData.allow_collaboration !== undefined) {
      const updateData: Partial<Collection> = {}
      if (shareData.make_public !== undefined) {
        updateData.is_public = shareData.make_public
      }
      if (shareData.allow_collaboration !== undefined) {
        updateData.is_collaborative = shareData.allow_collaboration
      }

      await this.updateCollection(collectionId, updateData, userId)
    }

    // Send notifications to specific users if emails provided
    if (shareData.user_emails?.length) {
      // Get user IDs from emails
      const { data: users, error: usersError } = await this.supabase
        .from('users')
        .select('id, email, full_name')
        .in('email', shareData.user_emails)

      if (usersError) throw usersError

      // Create notifications for each user
      const notifications = users.map(user => ({
        user_id: user.id,
        type: 'collection_shared' as const,
        title: 'Collection Shared With You',
        message: `A collection has been shared with you`,
        data: {
          collection_id: collectionId,
          shared_by: userId,
          can_collaborate: shareData.allow_collaboration
        }
      }))

      if (notifications.length > 0) {
        const { error: notificationError } = await this.supabase
          .from('notifications')
          .insert(notifications)

        if (notificationError) throw notificationError
        sharedWith.push(...users.map(u => u.email))
      }
    }

    return {
      success: true,
      shared_with: sharedWith
    }
  }

  /**
   * Get collection sharing URL
   */
  getCollectionShareUrl(collectionId: string): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    return `${baseUrl}/collections/${collectionId}`
  }

  /**
   * Search collections
   */
  async searchCollections(
    query: string,
    filters?: {
      tags?: string[]
      department?: string
      is_public?: boolean
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ collections: Collection[], total: number }> {
    let queryBuilder = this.supabase
      .from('collections')
      .select(`
        *,
        creator:created_by(id, full_name, department),
        resources:collection_resources(count)
      `, { count: 'exact' })

    // Add text search
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Add filters
    if (filters?.is_public !== undefined) {
      queryBuilder = queryBuilder.eq('is_public', filters.is_public)
    }

    if (filters?.tags?.length) {
      queryBuilder = queryBuilder.overlaps('tags', filters.tags)
    }

    if (filters?.department) {
      queryBuilder = queryBuilder.eq('creator.department', filters.department)
    }

    const { data: collections, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return { 
      collections: collections as Collection[], 
      total: count || 0 
    }
  }

  /**
   * Get collection analytics
   */
  async getCollectionAnalytics(collectionId: string, userId: string) {
    // Check permissions
    const permissions = await this.getCollectionPermissions(collectionId, userId)
    if (!permissions.can_view) {
      throw new Error('Insufficient permissions to view collection analytics')
    }

    // Get basic collection stats
    const { data: collection, error: collectionError } = await this.supabase
      .from('collections')
      .select(`
        *,
        resources:collection_resources(count)
      `)
      .eq('id', collectionId)
      .single()

    if (collectionError) throw collectionError

    // Get resource interaction stats
    const { data: interactions, error: interactionsError } = await this.supabase
      .from('user_interactions')
      .select('interaction_type, created_at')
      .in('resource_id', 
        await this.supabase
          .from('collection_resources')
          .select('resource_id')
          .eq('collection_id', collectionId)
          .then(({ data }) => data?.map(cr => cr.resource_id) || [])
      )

    if (interactionsError) throw interactionsError

    return {
      collection,
      resource_count: collection.resources?.[0]?.count || 0,
      total_interactions: interactions?.length || 0,
      interaction_breakdown: interactions?.reduce((acc, interaction) => {
        acc[interaction.interaction_type] = (acc[interaction.interaction_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }
  }
}

// Export singleton instance
export const collectionService = new CollectionService()
