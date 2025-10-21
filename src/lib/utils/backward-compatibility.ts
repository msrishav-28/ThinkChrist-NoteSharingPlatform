/**
 * Backward Compatibility Utilities
 * Ensures existing functionality continues to work with enhanced schema
 */

import { createClient } from '@/lib/supabase/client'
import type { Resource } from '@/types'

export interface LegacyResource {
  id: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  department: string
  course: string
  semester: number
  subject: string
  topic: string | null
  uploaded_by: string
  upvotes: number
  downvotes: number
  downloads: number
  is_verified: boolean
  created_at: string
  updated_at: string
}

export class BackwardCompatibilityService {
  private static supabase = createClient()

  /**
   * Migrate existing resources to new schema format
   * This ensures all existing resources have proper resource_type and other new fields
   */
  static async migrateExistingResources(): Promise<{
    success: boolean
    migratedCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let migratedCount = 0

    try {
      // Get all resources that don't have resource_type set or have null values
      const { data: resources, error: fetchError } = await this.supabase
        .from('resources')
        .select('*')
        .or('resource_type.is.null,tags.is.null,views.is.null')

      if (fetchError) {
        errors.push(`Failed to fetch resources: ${fetchError.message}`)
        return { success: false, migratedCount: 0, errors }
      }

      if (!resources || resources.length === 0) {
        return { success: true, migratedCount: 0, errors: [] }
      }

      // Process each resource
      for (const resource of resources) {
        try {
          const updates: Partial<Resource> = {}

          // Set resource_type based on file_type if not set
          if (!resource.resource_type) {
            updates.resource_type = this.detectResourceTypeFromFile(
              resource.file_type,
              resource.file_name
            )
          }

          // Initialize tags array if null
          if (!resource.tags) {
            updates.tags = []
          }

          // Initialize views if null
          if (resource.views === null || resource.views === undefined) {
            updates.views = 0
          }

          // Initialize content_metadata if null
          if (!resource.content_metadata) {
            updates.content_metadata = {}
          }

          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await this.supabase
              .from('resources')
              .update(updates)
              .eq('id', resource.id)

            if (updateError) {
              errors.push(`Failed to update resource ${resource.id}: ${updateError.message}`)
            } else {
              migratedCount++
            }
          }
        } catch (error) {
          errors.push(`Error processing resource ${resource.id}: ${error}`)
        }
      }

      return {
        success: errors.length === 0,
        migratedCount,
        errors
      }
    } catch (error) {
      errors.push(`Migration failed: ${error}`)
      return { success: false, migratedCount: 0, errors }
    }
  }

  /**
   * Detect resource type from file information
   */
  private static detectResourceTypeFromFile(fileType: string, fileName: string): 'document' | 'video' | 'code' | 'article' {
    if (!fileType && !fileName) return 'document'

    const type = fileType?.toLowerCase() || ''
    const name = fileName?.toLowerCase() || ''

    // Video files
    if (type.includes('video') || 
        name.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/)) {
      return 'video'
    }

    // Code files
    if (type.includes('text') && name.match(/\.(js|ts|py|java|cpp|c|html|css|json|xml|sql|php|rb|go|rs|swift|kt)$/)) {
      return 'code'
    }

    // Articles (text files that might be articles)
    if (type.includes('text') && name.match(/\.(md|txt)$/)) {
      return 'article'
    }

    // Default to document
    return 'document'
  }

  /**
   * Transform legacy resource to new format
   * Ensures backward compatibility when displaying resources
   */
  static transformLegacyResource(resource: any): Resource {
    return {
      ...resource,
      resource_type: resource.resource_type || this.detectResourceTypeFromFile(resource.file_type, resource.file_name),
      tags: resource.tags || [],
      views: resource.views || 0,
      content_metadata: resource.content_metadata || {},
      estimated_time: resource.estimated_time || null,
      difficulty_level: resource.difficulty_level || null,
      external_url: resource.external_url || null,
      link_preview: resource.link_preview || null,
    }
  }

  /**
   * Ensure user preferences exist for all users
   */
  static async ensureUserPreferences(): Promise<{
    success: boolean
    createdCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let createdCount = 0

    try {
      // Get all users who don't have preferences
      const { data: usersWithoutPrefs, error: fetchError } = await this.supabase
        .from('users')
        .select('id')
        .not('id', 'in', `(SELECT user_id FROM user_preferences)`)

      if (fetchError) {
        errors.push(`Failed to fetch users: ${fetchError.message}`)
        return { success: false, createdCount: 0, errors }
      }

      if (!usersWithoutPrefs || usersWithoutPrefs.length === 0) {
        return { success: true, createdCount: 0, errors: [] }
      }

      // Create preferences for users who don't have them
      const preferencesToCreate = usersWithoutPrefs.map(user => ({
        user_id: user.id,
        notification_settings: {
          email_digest: true,
          new_resources: true,
          votes_received: true,
          achievements: true
        },
        recommendation_settings: {
          enable_recommendations: true,
          track_interactions: true
        },
        privacy_settings: {
          profile_visibility: 'public',
          activity_visibility: 'public'
        }
      }))

      const { error: insertError } = await this.supabase
        .from('user_preferences')
        .insert(preferencesToCreate)

      if (insertError) {
        errors.push(`Failed to create user preferences: ${insertError.message}`)
        return { success: false, createdCount: 0, errors }
      }

      createdCount = preferencesToCreate.length

      return { success: true, createdCount, errors: [] }
    } catch (error) {
      errors.push(`Failed to ensure user preferences: ${error}`)
      return { success: false, createdCount: 0, errors }
    }
  }

  /**
   * Validate that existing file upload functionality still works
   */
  static async validateFileUploadCompatibility(): Promise<{
    success: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // Check if storage bucket exists
      const { data: buckets, error: bucketError } = await this.supabase.storage.listBuckets()
      
      if (bucketError) {
        issues.push(`Storage bucket check failed: ${bucketError.message}`)
      } else {
        const resourcesBucket = buckets?.find(b => b.name === 'resources')
        if (!resourcesBucket) {
          issues.push('Resources storage bucket not found')
        }
      }

      // Check if we can query resources table with both old and new schema
      const { data: resources, error: queryError } = await this.supabase
        .from('resources')
        .select(`
          id,
          title,
          description,
          file_url,
          file_name,
          file_size,
          file_type,
          resource_type,
          external_url,
          tags,
          views,
          content_metadata,
          department,
          course,
          semester,
          subject,
          topic,
          uploaded_by,
          upvotes,
          downvotes,
          downloads,
          is_verified,
          created_at,
          updated_at
        `)
        .limit(1)

      if (queryError) {
        issues.push(`Resource query failed: ${queryError.message}`)
      }

      return {
        success: issues.length === 0,
        issues
      }
    } catch (error) {
      issues.push(`Validation failed: ${error}`)
      return { success: false, issues }
    }
  }

  /**
   * Run complete backward compatibility check and migration
   */
  static async runCompatibilityMigration(): Promise<{
    success: boolean
    summary: {
      resourcesMigrated: number
      preferencesCreated: number
      validationPassed: boolean
    }
    errors: string[]
  }> {
    const allErrors: string[] = []

    console.log('🔄 Starting backward compatibility migration...')

    // 1. Validate current state
    console.log('📋 Validating file upload compatibility...')
    const validation = await this.validateFileUploadCompatibility()
    if (!validation.success) {
      allErrors.push(...validation.issues)
      console.error('❌ Validation failed:', validation.issues)
    } else {
      console.log('✅ File upload compatibility validated')
    }

    // 2. Migrate existing resources
    console.log('📋 Migrating existing resources...')
    const resourceMigration = await this.migrateExistingResources()
    if (!resourceMigration.success) {
      allErrors.push(...resourceMigration.errors)
      console.error('❌ Resource migration had errors:', resourceMigration.errors)
    } else {
      console.log(`✅ Migrated ${resourceMigration.migratedCount} resources`)
    }

    // 3. Ensure user preferences
    console.log('📋 Ensuring user preferences...')
    const preferenceMigration = await this.ensureUserPreferences()
    if (!preferenceMigration.success) {
      allErrors.push(...preferenceMigration.errors)
      console.error('❌ User preferences migration had errors:', preferenceMigration.errors)
    } else {
      console.log(`✅ Created preferences for ${preferenceMigration.createdCount} users`)
    }

    const success = allErrors.length === 0

    if (success) {
      console.log('🎉 Backward compatibility migration completed successfully!')
    } else {
      console.error('❌ Migration completed with errors:', allErrors)
    }

    return {
      success,
      summary: {
        resourcesMigrated: resourceMigration.migratedCount,
        preferencesCreated: preferenceMigration.createdCount,
        validationPassed: validation.success
      },
      errors: allErrors
    }
  }
}