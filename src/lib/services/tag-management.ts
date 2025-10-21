import { createClient } from '@/lib/supabase/client'
import type { Resource } from '@/types'

export interface TagSuggestion {
  tag: string
  confidence: number
  source: 'content' | 'similar' | 'popular' | 'department' | 'course'
  count?: number
}

export interface TagAnalytics {
  tag: string
  usage_count: number
  departments: string[]
  courses: string[]
  recent_usage: number
  trending_score: number
}

export class TagManagementService {
  private static supabase = createClient()

  /**
   * Normalize tag text to ensure consistency
   */
  static normalizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  /**
   * Generate tag suggestions based on content analysis
   */
  static async generateTagSuggestions(
    title: string,
    description?: string,
    department?: string,
    course?: string,
    resourceType?: string
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = []

    try {
      // Content-based suggestions
      const contentSuggestions = await this.extractTagsFromContent(title, description)
      suggestions.push(...contentSuggestions)

      // Popular tags in department/course
      if (department || course) {
        const popularSuggestions = await this.getPopularTags(department, course)
        suggestions.push(...popularSuggestions)
      }

      // Resource type specific tags
      if (resourceType) {
        const typeSuggestions = await this.getResourceTypeSpecificTags(resourceType)
        suggestions.push(...typeSuggestions)
      }

      // Remove duplicates and sort by confidence
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions)
      return uniqueSuggestions.slice(0, 10) // Return top 10 suggestions
    } catch (error) {
      console.error('Error generating tag suggestions:', error)
      return []
    }
  }

  /**
   * Extract potential tags from content using simple keyword analysis
   */
  private static async extractTagsFromContent(
    title: string,
    description?: string
  ): Promise<TagSuggestion[]> {
    const text = `${title} ${description || ''}`.toLowerCase()
    const suggestions: TagSuggestion[] = []

    // Common academic keywords and their variations
    const academicKeywords = {
      'programming': ['programming', 'coding', 'development', 'software'],
      'mathematics': ['math', 'mathematics', 'calculus', 'algebra', 'geometry'],
      'physics': ['physics', 'mechanics', 'thermodynamics', 'quantum'],
      'chemistry': ['chemistry', 'organic', 'inorganic', 'biochemistry'],
      'biology': ['biology', 'genetics', 'molecular', 'cell'],
      'computer-science': ['computer', 'algorithm', 'data-structure', 'ai', 'ml'],
      'web-development': ['html', 'css', 'javascript', 'react', 'node'],
      'database': ['database', 'sql', 'mysql', 'postgresql', 'mongodb'],
      'networking': ['network', 'tcp', 'ip', 'routing', 'protocol'],
      'security': ['security', 'encryption', 'authentication', 'cybersecurity'],
      'machine-learning': ['machine-learning', 'neural', 'deep-learning', 'ai'],
      'data-science': ['data-science', 'analytics', 'statistics', 'visualization']
    }

    // Programming languages
    const programmingLanguages = [
      'javascript', 'python', 'java', 'cpp', 'c-plus-plus', 'csharp', 'c-sharp',
      'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'html', 'css'
    ]

    // Check for academic keywords
    Object.entries(academicKeywords).forEach(([tag, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword))
      if (matches.length > 0) {
        suggestions.push({
          tag: this.normalizeTag(tag),
          confidence: Math.min(0.9, matches.length * 0.3),
          source: 'content'
        })
      }
    })

    // Check for programming languages
    programmingLanguages.forEach(lang => {
      if (text.includes(lang.replace('-', '')) || text.includes(lang)) {
        suggestions.push({
          tag: this.normalizeTag(lang),
          confidence: 0.8,
          source: 'content'
        })
      }
    })

    // Extract potential tags from title (important words)
    const titleWords = title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word))
      .slice(0, 3) // Take first 3 meaningful words

    titleWords.forEach(word => {
      suggestions.push({
        tag: this.normalizeTag(word),
        confidence: 0.6,
        source: 'content'
      })
    })

    return suggestions
  }

  /**
   * Get popular tags for a department/course
   */
  private static async getPopularTags(
    department?: string,
    course?: string
  ): Promise<TagSuggestion[]> {
    try {
      let query = this.supabase
        .from('resources')
        .select('tags')

      if (department) {
        query = query.eq('department', department)
      }
      if (course) {
        query = query.eq('course', course)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error

      // Count tag frequency
      const tagCounts: { [key: string]: number } = {}
      data?.forEach(resource => {
        resource.tags?.forEach((tag: string) => {
          const normalizedTag = this.normalizeTag(tag)
          tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1
        })
      })

      // Convert to suggestions
      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([tag, count]) => ({
          tag,
          confidence: Math.min(0.7, count / 10),
          source: 'popular' as const,
          count
        }))
    } catch (error) {
      console.error('Error fetching popular tags:', error)
      return []
    }
  }

  /**
   * Get resource type specific common tags
   */
  private static async getResourceTypeSpecificTags(
    resourceType: string
  ): Promise<TagSuggestion[]> {
    const typeSpecificTags: { [key: string]: string[] } = {
      'video': ['tutorial', 'lecture', 'demonstration', 'explanation'],
      'code': ['source-code', 'repository', 'implementation', 'example'],
      'document': ['notes', 'reference', 'guide', 'documentation'],
      'link': ['article', 'blog', 'resource', 'external'],
      'article': ['reading', 'research', 'paper', 'study']
    }

    const tags = typeSpecificTags[resourceType] || []
    return tags.map(tag => ({
      tag: this.normalizeTag(tag),
      confidence: 0.5,
      source: 'similar' as const
    }))
  }

  /**
   * Remove duplicate suggestions and merge confidence scores
   */
  private static deduplicateSuggestions(suggestions: TagSuggestion[]): TagSuggestion[] {
    const tagMap: { [key: string]: TagSuggestion } = {}

    suggestions.forEach(suggestion => {
      const existing = tagMap[suggestion.tag]
      if (existing) {
        // Merge confidence scores (take higher value)
        existing.confidence = Math.max(existing.confidence, suggestion.confidence)
        if (suggestion.count) {
          existing.count = (existing.count || 0) + suggestion.count
        }
      } else {
        tagMap[suggestion.tag] = { ...suggestion }
      }
    })

    return Object.values(tagMap)
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Get all existing tags with autocomplete support
   */
  static async getExistingTags(
    query?: string,
    department?: string,
    course?: string,
    limit: number = 20
  ): Promise<string[]> {
    try {
      let dbQuery = this.supabase
        .from('resources')
        .select('tags')

      if (department) {
        dbQuery = dbQuery.eq('department', department)
      }
      if (course) {
        dbQuery = dbQuery.eq('course', course)
      }

      const { data, error } = await dbQuery.limit(200)

      if (error) throw error

      // Flatten and normalize all tags
      const allTags = new Set<string>()
      data?.forEach(resource => {
        resource.tags?.forEach((tag: string) => {
          const normalizedTag = this.normalizeTag(tag)
          if (normalizedTag) {
            allTags.add(normalizedTag)
          }
        })
      })

      let tags = Array.from(allTags)

      // Filter by query if provided
      if (query) {
        const queryLower = query.toLowerCase()
        tags = tags.filter(tag => tag.toLowerCase().includes(queryLower))
      }

      return tags.slice(0, limit)
    } catch (error) {
      console.error('Error fetching existing tags:', error)
      return []
    }
  }

  /**
   * Get tag analytics for management purposes
   */
  static async getTagAnalytics(limit: number = 50): Promise<TagAnalytics[]> {
    try {
      const { data, error } = await this.supabase
        .from('resources')
        .select('tags, department, course, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      const tagStats: { [key: string]: {
        count: number
        departments: Set<string>
        courses: Set<string>
        recentUsage: number
      } } = {}

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      data?.forEach(resource => {
        const isRecent = new Date(resource.created_at) > thirtyDaysAgo
        
        resource.tags?.forEach((tag: string) => {
          const normalizedTag = this.normalizeTag(tag)
          if (!tagStats[normalizedTag]) {
            tagStats[normalizedTag] = {
              count: 0,
              departments: new Set(),
              courses: new Set(),
              recentUsage: 0
            }
          }

          tagStats[normalizedTag].count++
          tagStats[normalizedTag].departments.add(resource.department)
          tagStats[normalizedTag].courses.add(resource.course)
          
          if (isRecent) {
            tagStats[normalizedTag].recentUsage++
          }
        })
      })

      return Object.entries(tagStats)
        .map(([tag, stats]) => ({
          tag,
          usage_count: stats.count,
          departments: Array.from(stats.departments),
          courses: Array.from(stats.courses),
          recent_usage: stats.recentUsage,
          trending_score: stats.recentUsage / Math.max(stats.count, 1)
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching tag analytics:', error)
      return []
    }
  }

  /**
   * Suggest tag merges for cleanup
   */
  static async suggestTagMerges(): Promise<Array<{
    primary: string
    duplicates: string[]
    confidence: number
  }>> {
    try {
      const analytics = await this.getTagAnalytics(200)
      const mergesSuggestions: Array<{
        primary: string
        duplicates: string[]
        confidence: number
      }> = []

      // Find similar tags that could be merged
      for (let i = 0; i < analytics.length; i++) {
        const tag1 = analytics[i]
        const duplicates: string[] = []

        for (let j = i + 1; j < analytics.length; j++) {
          const tag2 = analytics[j]
          const similarity = this.calculateTagSimilarity(tag1.tag, tag2.tag)
          
          if (similarity > 0.8) {
            duplicates.push(tag2.tag)
          }
        }

        if (duplicates.length > 0) {
          mergesSuggestions.push({
            primary: tag1.tag,
            duplicates,
            confidence: Math.min(0.9, duplicates.length * 0.3)
          })
        }
      }

      return mergesSuggestions.slice(0, 10)
    } catch (error) {
      console.error('Error suggesting tag merges:', error)
      return []
    }
  }

  /**
   * Calculate similarity between two tags
   */
  private static calculateTagSimilarity(tag1: string, tag2: string): number {
    // Simple similarity based on edit distance and common words
    const words1 = tag1.split('-')
    const words2 = tag2.split('-')
    
    const commonWords = words1.filter(word => words2.includes(word))
    const totalWords = new Set([...words1, ...words2]).size
    
    return commonWords.length / totalWords
  }

  /**
   * Check if a word is a stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ])
    return stopWords.has(word.toLowerCase())
  }

  /**
   * Merge tags in the database
   */
  static async mergeTags(primaryTag: string, tagsToMerge: string[]): Promise<boolean> {
    try {
      const normalizedPrimary = this.normalizeTag(primaryTag)
      const normalizedMerge = tagsToMerge.map(tag => this.normalizeTag(tag))

      // Get all resources that have any of the tags to merge
      const { data: resources, error: fetchError } = await this.supabase
        .from('resources')
        .select('id, tags')
        .overlaps('tags', normalizedMerge)

      if (fetchError) throw fetchError

      // Update each resource
      for (const resource of resources || []) {
        const updatedTags = resource.tags
          .map((tag: string) => this.normalizeTag(tag))
          .map((tag: string) => normalizedMerge.includes(tag) ? normalizedPrimary : tag)
          .filter((tag: string, index: number, arr: string[]) => arr.indexOf(tag) === index) // Remove duplicates

        const { error: updateError } = await this.supabase
          .from('resources')
          .update({ tags: updatedTags })
          .eq('id', resource.id)

        if (updateError) throw updateError
      }

      return true
    } catch (error) {
      console.error('Error merging tags:', error)
      return false
    }
  }
}