import { createClient } from '@/lib/supabase/client'
import type { Collection } from '@/types'

export interface CollectionPermissions {
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  can_add_resources: boolean
  can_remove_resources: boolean
  can_reorder: boolean
  can_share: boolean
  can_manage_collaborators: boolean
}

export interface CollectionAccessLevel {
  level: 'none' | 'view' | 'collaborate' | 'owner'
  permissions: CollectionPermissions
}

/**
 * Collection permissions utility class
 */
export class CollectionPermissionsUtil {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  /**
   * Get user's access level and permissions for a collection
   */
  async getUserAccessLevel(
    collectionId: string, 
    userId: string | null
  ): Promise<CollectionAccessLevel> {
    if (!userId) {
      return this.getPublicAccessLevel(collectionId)
    }

    const { data: collection, error } = await this.supabase
      .from('collections')
      .select('created_by, is_public, is_collaborative')
      .eq('id', collectionId)
      .single()

    if (error) {
      return {
        level: 'none',
        permissions: this.getNoPermissions()
      }
    }

    return this.calculateAccessLevel(collection, userId)
  }

  /**
   * Get access level for public (non-authenticated) users
   */
  private async getPublicAccessLevel(collectionId: string): Promise<CollectionAccessLevel> {
    const { data: collection, error } = await this.supabase
      .from('collections')
      .select('is_public')
      .eq('id', collectionId)
      .single()

    if (error || !collection?.is_public) {
      return {
        level: 'none',
        permissions: this.getNoPermissions()
      }
    }

    return {
      level: 'view',
      permissions: this.getViewOnlyPermissions()
    }
  }

  /**
   * Calculate access level based on collection settings and user relationship
   */
  private calculateAccessLevel(
    collection: Pick<Collection, 'created_by' | 'is_public' | 'is_collaborative'>,
    userId: string
  ): CollectionAccessLevel {
    const isOwner = collection.created_by === userId
    const canView = collection.is_public || isOwner
    const canCollaborate = collection.is_collaborative && canView

    if (isOwner) {
      return {
        level: 'owner',
        permissions: this.getOwnerPermissions()
      }
    }

    if (canCollaborate) {
      return {
        level: 'collaborate',
        permissions: this.getCollaboratorPermissions()
      }
    }

    if (canView) {
      return {
        level: 'view',
        permissions: this.getViewOnlyPermissions()
      }
    }

    return {
      level: 'none',
      permissions: this.getNoPermissions()
    }
  }

  /**
   * Check if user can perform a specific action on a collection
   */
  async canPerformAction(
    collectionId: string,
    userId: string | null,
    action: keyof CollectionPermissions
  ): Promise<boolean> {
    const accessLevel = await this.getUserAccessLevel(collectionId, userId)
    return accessLevel.permissions[action]
  }

  /**
   * Bulk check permissions for multiple collections
   */
  async getBulkPermissions(
    collectionIds: string[],
    userId: string | null
  ): Promise<Record<string, CollectionAccessLevel>> {
    if (!userId) {
      // For non-authenticated users, check which collections are public
      const { data: collections, error } = await this.supabase
        .from('collections')
        .select('id, is_public')
        .in('id', collectionIds)

      if (error) {
        return collectionIds.reduce((acc, id) => {
          acc[id] = { level: 'none', permissions: this.getNoPermissions() }
          return acc
        }, {} as Record<string, CollectionAccessLevel>)
      }

      return collections.reduce((acc, collection) => {
        acc[collection.id] = collection.is_public
          ? { level: 'view', permissions: this.getViewOnlyPermissions() }
          : { level: 'none', permissions: this.getNoPermissions() }
        return acc
      }, {} as Record<string, CollectionAccessLevel>)
    }

    const { data: collections, error } = await this.supabase
      .from('collections')
      .select('id, created_by, is_public, is_collaborative')
      .in('id', collectionIds)

    if (error) {
      return collectionIds.reduce((acc, id) => {
        acc[id] = { level: 'none', permissions: this.getNoPermissions() }
        return acc
      }, {} as Record<string, CollectionAccessLevel>)
    }

    return collections.reduce((acc, collection) => {
      acc[collection.id] = this.calculateAccessLevel(collection, userId)
      return acc
    }, {} as Record<string, CollectionAccessLevel>)
  }

  /**
   * Get collections that user has specific permission for
   */
  async getCollectionsWithPermission(
    userId: string,
    permission: keyof CollectionPermissions,
    limit?: number
  ): Promise<string[]> {
    let query = this.supabase
      .from('collections')
      .select('id, created_by, is_public, is_collaborative')

    if (limit) {
      query = query.limit(limit)
    }

    const { data: collections, error } = await query

    if (error) return []

    return collections
      .filter(collection => {
        const accessLevel = this.calculateAccessLevel(collection, userId)
        return accessLevel.permissions[permission]
      })
      .map(collection => collection.id)
  }

  // Permission level definitions

  private getNoPermissions(): CollectionPermissions {
    return {
      can_view: false,
      can_edit: false,
      can_delete: false,
      can_add_resources: false,
      can_remove_resources: false,
      can_reorder: false,
      can_share: false,
      can_manage_collaborators: false
    }
  }

  private getViewOnlyPermissions(): CollectionPermissions {
    return {
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_add_resources: false,
      can_remove_resources: false,
      can_reorder: false,
      can_share: false,
      can_manage_collaborators: false
    }
  }

  private getCollaboratorPermissions(): CollectionPermissions {
    return {
      can_view: true,
      can_edit: true,
      can_delete: false,
      can_add_resources: true,
      can_remove_resources: true,
      can_reorder: true,
      can_share: false,
      can_manage_collaborators: false
    }
  }

  private getOwnerPermissions(): CollectionPermissions {
    return {
      can_view: true,
      can_edit: true,
      can_delete: true,
      can_add_resources: true,
      can_remove_resources: true,
      can_reorder: true,
      can_share: true,
      can_manage_collaborators: true
    }
  }
}

// Export singleton instance
export const collectionPermissions = new CollectionPermissionsUtil()

/**
 * Helper function to check if user can access collection
 */
export async function canAccessCollection(
  collectionId: string,
  userId: string | null
): Promise<boolean> {
  return await collectionPermissions.canPerformAction(collectionId, userId, 'can_view')
}

/**
 * Helper function to check if user can edit collection
 */
export async function canEditCollection(
  collectionId: string,
  userId: string | null
): Promise<boolean> {
  return await collectionPermissions.canPerformAction(collectionId, userId, 'can_edit')
}

/**
 * Helper function to check if user owns collection
 */
export async function isCollectionOwner(
  collectionId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false
  
  const accessLevel = await collectionPermissions.getUserAccessLevel(collectionId, userId)
  return accessLevel.level === 'owner'
}
