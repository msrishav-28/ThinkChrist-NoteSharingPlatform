'use client'

import { useState, useEffect, useCallback } from 'react'
import { TagManagementService, type TagSuggestion, type TagAnalytics } from '@/lib/services/tag-management'
import { useAuth } from './use-auth'

export interface UseTagsOptions {
  department?: string
  course?: string
  resourceType?: string
  enableSuggestions?: boolean
}

export function useTags(options: UseTagsOptions = {}) {
  const { profile } = useAuth()
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const department = options.department || profile?.department
  const course = options.course

  /**
   * Generate tag suggestions based on content
   */
  const generateSuggestions = useCallback(async (
    title: string,
    description?: string
  ) => {
    if (!options.enableSuggestions) return

    setLoading(true)
    setError(null)

    try {
      const suggestions = await TagManagementService.generateTagSuggestions(
        title,
        description,
        department,
        course,
        options.resourceType
      )
      setSuggestions(suggestions)
    } catch (err) {
      setError('Failed to generate tag suggestions')
      console.error('Error generating suggestions:', err)
    } finally {
      setLoading(false)
    }
  }, [department, course, options.resourceType, options.enableSuggestions])

  /**
   * Search for existing tags with autocomplete
   */
  const searchTags = useCallback(async (query: string) => {
    if (!query.trim()) {
      setExistingTags([])
      return
    }

    try {
      const tags = await TagManagementService.getExistingTags(
        query,
        department,
        course,
        20
      )
      setExistingTags(tags)
    } catch (err) {
      console.error('Error searching tags:', err)
    }
  }, [department, course])

  /**
   * Get popular tags for the current context
   */
  const getPopularTags = useCallback(async () => {
    try {
      const suggestions = await TagManagementService.generateTagSuggestions(
        '', // Empty title to get only popular/contextual tags
        '',
        department,
        course,
        options.resourceType
      )
      return suggestions.filter(s => s.source === 'popular').map(s => s.tag)
    } catch (err) {
      console.error('Error fetching popular tags:', err)
      return []
    }
  }, [department, course, options.resourceType])

  /**
   * Normalize a tag
   */
  const normalizeTag = useCallback((tag: string) => {
    return TagManagementService.normalizeTag(tag)
  }, [])

  return {
    suggestions,
    existingTags,
    loading,
    error,
    generateSuggestions,
    searchTags,
    getPopularTags,
    normalizeTag
  }
}

/**
 * Hook for tag analytics and management
 */
export function useTagAnalytics() {
  const [analytics, setAnalytics] = useState<TagAnalytics[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await TagManagementService.getTagAnalytics(50)
      setAnalytics(data)
    } catch (err) {
      setError('Failed to fetch tag analytics')
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const suggestMerges = useCallback(async () => {
    try {
      return await TagManagementService.suggestTagMerges()
    } catch (err) {
      console.error('Error suggesting merges:', err)
      return []
    }
  }, [])

  const mergeTags = useCallback(async (primaryTag: string, tagsToMerge: string[]) => {
    try {
      const success = await TagManagementService.mergeTags(primaryTag, tagsToMerge)
      if (success) {
        // Refresh analytics after merge
        await fetchAnalytics()
      }
      return success
    } catch (err) {
      console.error('Error merging tags:', err)
      return false
    }
  }, [fetchAnalytics])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    error,
    fetchAnalytics,
    suggestMerges,
    mergeTags
  }
}