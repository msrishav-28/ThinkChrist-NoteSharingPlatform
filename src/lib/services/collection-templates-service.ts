import { createClient } from '@/lib/supabase/client'
import { collectionService } from './collection-service'
import type { Collection, Resource } from '@/types'

export interface CollectionTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  icon: string
  color: string
  structure: TemplateStructure
  is_system: boolean
  created_by?: string
  usage_count: number
  created_at: string
}

export interface TemplateStructure {
  sections: TemplateSection[]
  suggested_resources?: SuggestedResource[]
  auto_organize?: boolean
}

export interface TemplateSection {
  id: string
  name: string
  description?: string
  order_index: number
  resource_types?: string[]
  tags?: string[]
}

export interface SuggestedResource {
  title: string
  description: string
  resource_type: string
  tags: string[]
  section_id?: string
}

export interface CollectionRecommendation {
  id: string
  type: 'template' | 'similar_collection' | 'trending' | 'personalized'
  title: string
  description: string
  reason: string
  confidence: number
  data: Record<string, any>
  created_at: string
}

/**
 * Service for managing collection templates and recommendations
 */
export class CollectionTemplatesService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  // Predefined system templates
  private systemTemplates: CollectionTemplate[] = [
    {
      id: 'course-study-guide',
      name: 'Course Study Guide',
      description: 'Organize all materials for a specific course including lectures, assignments, and resources',
      category: 'Academic',
      tags: ['study', 'course', 'academic'],
      icon: '📚',
      color: 'blue',
      structure: {
        sections: [
          {
            id: 'lectures',
            name: 'Lecture Materials',
            description: 'Video lectures, slides, and notes',
            order_index: 0,
            resource_types: ['video', 'document'],
            tags: ['lecture', 'slides']
          },
          {
            id: 'assignments',
            name: 'Assignments & Projects',
            description: 'Assignment instructions and project guidelines',
            order_index: 1,
            resource_types: ['document'],
            tags: ['assignment', 'project']
          },
          {
            id: 'readings',
            name: 'Required Readings',
            description: 'Textbooks, articles, and supplementary materials',
            order_index: 2,
            resource_types: ['document', 'article', 'link'],
            tags: ['reading', 'textbook']
          },
          {
            id: 'resources',
            name: 'Additional Resources',
            description: 'Extra materials and references',
            order_index: 3,
            tags: ['reference', 'extra']
          }
        ],
        auto_organize: true
      },
      is_system: true,
      usage_count: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'research-project',
      name: 'Research Project',
      description: 'Collect and organize resources for a research project or thesis',
      category: 'Research',
      tags: ['research', 'project', 'thesis'],
      icon: '🔬',
      color: 'green',
      structure: {
        sections: [
          {
            id: 'literature',
            name: 'Literature Review',
            description: 'Academic papers and research articles',
            order_index: 0,
            resource_types: ['article', 'document'],
            tags: ['paper', 'research', 'literature']
          },
          {
            id: 'data',
            name: 'Data & Datasets',
            description: 'Research data and datasets',
            order_index: 1,
            resource_types: ['document', 'link'],
            tags: ['data', 'dataset']
          },
          {
            id: 'methodology',
            name: 'Methodology',
            description: 'Research methods and tools',
            order_index: 2,
            resource_types: ['document', 'code'],
            tags: ['methodology', 'tools']
          },
          {
            id: 'drafts',
            name: 'Drafts & Notes',
            description: 'Working documents and notes',
            order_index: 3,
            resource_types: ['document'],
            tags: ['draft', 'notes']
          }
        ],
        auto_organize: true
      },
      is_system: true,
      usage_count: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'programming-learning',
      name: 'Programming Learning Path',
      description: 'Structured collection for learning a programming language or technology',
      category: 'Programming',
      tags: ['programming', 'learning', 'tutorial'],
      icon: '💻',
      color: 'purple',
      structure: {
        sections: [
          {
            id: 'basics',
            name: 'Fundamentals',
            description: 'Basic concepts and syntax',
            order_index: 0,
            resource_types: ['video', 'document', 'article'],
            tags: ['basics', 'fundamentals', 'syntax']
          },
          {
            id: 'tutorials',
            name: 'Tutorials & Examples',
            description: 'Step-by-step tutorials and code examples',
            order_index: 1,
            resource_types: ['video', 'code', 'link'],
            tags: ['tutorial', 'example', 'code']
          },
          {
            id: 'projects',
            name: 'Practice Projects',
            description: 'Hands-on projects and exercises',
            order_index: 2,
            resource_types: ['code', 'document'],
            tags: ['project', 'exercise', 'practice']
          },
          {
            id: 'advanced',
            name: 'Advanced Topics',
            description: 'Advanced concepts and best practices',
            order_index: 3,
            resource_types: ['article', 'video', 'code'],
            tags: ['advanced', 'best-practices']
          }
        ],
        auto_organize: true
      },
      is_system: true,
      usage_count: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'exam-preparation',
      name: 'Exam Preparation',
      description: 'Organize study materials for exam preparation',
      category: 'Academic',
      tags: ['exam', 'study', 'preparation'],
      icon: '📝',
      color: 'orange',
      structure: {
        sections: [
          {
            id: 'syllabus',
            name: 'Syllabus & Topics',
            description: 'Exam syllabus and topic breakdown',
            order_index: 0,
            resource_types: ['document'],
            tags: ['syllabus', 'topics']
          },
          {
            id: 'notes',
            name: 'Study Notes',
            description: 'Compiled notes and summaries',
            order_index: 1,
            resource_types: ['document'],
            tags: ['notes', 'summary']
          },
          {
            id: 'practice',
            name: 'Practice Tests',
            description: 'Past papers and practice questions',
            order_index: 2,
            resource_types: ['document'],
            tags: ['practice', 'test', 'questions']
          },
          {
            id: 'resources',
            name: 'Reference Materials',
            description: 'Additional study resources',
            order_index: 3,
            tags: ['reference', 'study']
          }
        ],
        auto_organize: true
      },
      is_system: true,
      usage_count: 0,
      created_at: new Date().toISOString()
    },
    {
      id: 'group-project',
      name: 'Group Project Collaboration',
      description: 'Collaborative workspace for group projects and team assignments',
      category: 'Collaboration',
      tags: ['group', 'project', 'collaboration'],
      icon: '👥',
      color: 'teal',
      structure: {
        sections: [
          {
            id: 'planning',
            name: 'Project Planning',
            description: 'Project requirements and planning documents',
            order_index: 0,
            resource_types: ['document'],
            tags: ['planning', 'requirements']
          },
          {
            id: 'resources',
            name: 'Shared Resources',
            description: 'Common resources and references',
            order_index: 1,
            tags: ['shared', 'reference']
          },
          {
            id: 'contributions',
            name: 'Individual Contributions',
            description: 'Work contributed by team members',
            order_index: 2,
            tags: ['contribution', 'individual']
          },
          {
            id: 'final',
            name: 'Final Deliverables',
            description: 'Completed work and final submissions',
            order_index: 3,
            resource_types: ['document', 'code'],
            tags: ['final', 'deliverable']
          }
        ],
        auto_organize: true
      },
      is_system: true,
      usage_count: 0,
      created_at: new Date().toISOString()
    }
  ]

  /**
   * Get all available templates
   */
  async getTemplates(category?: string): Promise<CollectionTemplate[]> {
    let templates = [...this.systemTemplates]

    // Filter by category if specified
    if (category) {
      templates = templates.filter(template => 
        template.category.toLowerCase() === category.toLowerCase()
      )
    }

    // TODO: Add user-created templates from database
    // const { data: userTemplates } = await this.supabase
    //   .from('collection_templates')
    //   .select('*')
    //   .eq('is_system', false)

    return templates.sort((a, b) => b.usage_count - a.usage_count)
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<CollectionTemplate | null> {
    const template = this.systemTemplates.find(t => t.id === templateId)
    if (template) return template

    // TODO: Check user-created templates in database
    return null
  }

  /**
   * Create collection from template
   */
  async createCollectionFromTemplate(
    templateId: string,
    userId: string,
    customization?: {
      title?: string
      description?: string
      tags?: string[]
      is_public?: boolean
      is_collaborative?: boolean
    }
  ): Promise<Collection> {
    const template = await this.getTemplate(templateId)
    if (!template) {
      throw new Error('Template not found')
    }

    // Create the collection
    const collectionData = {
      title: customization?.title || `${template.name} Collection`,
      description: customization?.description || template.description,
      tags: customization?.tags || template.tags,
      is_public: customization?.is_public || false,
      is_collaborative: customization?.is_collaborative || false
    }

    const collection = await collectionService.createCollection(collectionData, userId)

    // TODO: Create sections as collection resources or metadata
    // For now, we'll add the template structure to the collection description
    const structureInfo = template.structure.sections
      .map(section => `• ${section.name}: ${section.description || 'No description'}`)
      .join('\n')

    await collectionService.updateCollection(
      collection.id,
      {
        description: `${collection.description}\n\nTemplate Structure:\n${structureInfo}`
      },
      userId
    )

    // Increment template usage count
    await this.incrementTemplateUsage(templateId)

    return collection
  }

  /**
   * Get template categories
   */
  getTemplateCategories(): string[] {
    const categories = new Set(this.systemTemplates.map(t => t.category))
    return Array.from(categories).sort()
  }

  /**
   * Get collection recommendations for a user
   */
  async getCollectionRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<CollectionRecommendation[]> {
    const recommendations: CollectionRecommendation[] = []

    try {
      // Get user's existing collections and resources
      const userCollections = await collectionService.getCollectionsByUser(userId, true)
      const userInterests = await this.analyzeUserInterests(userId)

      // Template recommendations based on user interests
      const templateRecommendations = await this.getTemplateRecommendations(userInterests)
      recommendations.push(...templateRecommendations)

      // Similar collections recommendations
      const similarCollections = await this.getSimilarCollectionRecommendations(userId, userInterests)
      recommendations.push(...similarCollections)

      // Trending collections
      const trendingCollections = await this.getTrendingCollectionRecommendations()
      recommendations.push(...trendingCollections)

      // Sort by confidence and limit results
      return recommendations
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit)

    } catch (error) {
      console.error('Error getting recommendations:', error)
      return []
    }
  }

  /**
   * Analyze user interests based on their activity
   */
  private async analyzeUserInterests(userId: string): Promise<{
    departments: string[]
    subjects: string[]
    resourceTypes: string[]
    tags: string[]
  }> {
    const { data: userResources } = await this.supabase
      .from('resources')
      .select('department, subject, resource_type, tags')
      .eq('uploaded_by', userId)
      .limit(50)

    const { data: userInteractions } = await this.supabase
      .from('user_interactions')
      .select(`
        resource:resources(department, subject, resource_type, tags)
      `)
      .eq('user_id', userId)
      .limit(100)

    const allResources = [
      ...(userResources || []),
      ...(userInteractions?.map(i => i.resource).filter(Boolean) || [])
    ].filter(Boolean)

    const departments = Array.from(new Set(allResources.map((r: any) => r.department).filter(Boolean)))
    const subjects = Array.from(new Set(allResources.map((r: any) => r.subject).filter(Boolean)))
    const resourceTypes = Array.from(new Set(allResources.map((r: any) => r.resource_type).filter(Boolean)))
    const tags = Array.from(new Set(allResources.flatMap((r: any) => r.tags || [])))

    return { departments, subjects, resourceTypes, tags }
  }

  /**
   * Get template recommendations based on user interests
   */
  private async getTemplateRecommendations(
    userInterests: any
  ): Promise<CollectionRecommendation[]> {
    const recommendations: CollectionRecommendation[] = []

    for (const template of this.systemTemplates) {
      let confidence = 0.3 // Base confidence

      // Check tag overlap
      const tagOverlap = template.tags.filter(tag => 
        userInterests.tags.some((userTag: string) => 
          userTag.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(userTag.toLowerCase())
        )
      ).length

      confidence += (tagOverlap / template.tags.length) * 0.4

      // Check category relevance
      if (template.category === 'Academic' && userInterests.departments.length > 0) {
        confidence += 0.2
      }
      if (template.category === 'Programming' && userInterests.resourceTypes.includes('code')) {
        confidence += 0.3
      }

      if (confidence > 0.4) {
        recommendations.push({
          id: `template-${template.id}`,
          type: 'template',
          title: `Try the "${template.name}" template`,
          description: template.description,
          reason: `Based on your interest in ${template.tags.slice(0, 2).join(' and ')}`,
          confidence,
          data: { template_id: template.id, template },
          created_at: new Date().toISOString()
        })
      }
    }

    return recommendations
  }

  /**
   * Get similar collection recommendations
   */
  private async getSimilarCollectionRecommendations(
    userId: string,
    userInterests: any
  ): Promise<CollectionRecommendation[]> {
    const { data: publicCollections } = await this.supabase
      .from('collections')
      .select(`
        *,
        creator:created_by(full_name),
        resources:collection_resources(count)
      `)
      .eq('is_public', true)
      .neq('created_by', userId)
      .limit(20)

    if (!publicCollections) return []

    const recommendations: CollectionRecommendation[] = []

    for (const collection of publicCollections) {
      let confidence = 0.2 // Base confidence

      // Check tag overlap
      const tagOverlap = (collection.tags || []).filter((tag: string) => 
        userInterests.tags.includes(tag)
      ).length

      if (tagOverlap > 0) {
        confidence += (tagOverlap / (collection.tags?.length || 1)) * 0.5
      }

      // Check if collection has resources
      const resourceCount = collection.resources?.[0]?.count || 0
      if (resourceCount > 0) {
        confidence += 0.2
      }

      if (confidence > 0.4) {
        recommendations.push({
          id: `collection-${collection.id}`,
          type: 'similar_collection',
          title: `Check out "${collection.title}"`,
          description: collection.description || 'No description available',
          reason: `Similar to your interests in ${(collection.tags || []).slice(0, 2).join(' and ')}`,
          confidence,
          data: { collection_id: collection.id, collection },
          created_at: new Date().toISOString()
        })
      }
    }

    return recommendations
  }

  /**
   * Get trending collection recommendations
   */
  private async getTrendingCollectionRecommendations(): Promise<CollectionRecommendation[]> {
    // Get collections with recent activity
    const { data: trendingCollections } = await this.supabase
      .from('collections')
      .select(`
        *,
        creator:created_by(full_name),
        resources:collection_resources(count)
      `)
      .eq('is_public', true)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .limit(5)

    if (!trendingCollections) return []

    return trendingCollections.map(collection => ({
      id: `trending-${collection.id}`,
      type: 'trending' as const,
      title: `Trending: "${collection.title}"`,
      description: collection.description || 'No description available',
      reason: 'Popular this week',
      confidence: 0.6,
      data: { collection_id: collection.id, collection },
      created_at: new Date().toISOString()
    }))
  }

  /**
   * Increment template usage count
   */
  private async incrementTemplateUsage(templateId: string): Promise<void> {
    const template = this.systemTemplates.find(t => t.id === templateId)
    if (template) {
      template.usage_count++
    }

    // TODO: Update usage count in database for user-created templates
  }

  /**
   * Search templates
   */
  searchTemplates(query: string): CollectionTemplate[] {
    const searchTerm = query.toLowerCase()
    
    return this.systemTemplates.filter(template =>
      template.name.toLowerCase().includes(searchTerm) ||
      template.description.toLowerCase().includes(searchTerm) ||
      template.category.toLowerCase().includes(searchTerm) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }
}

// Export singleton instance
export const collectionTemplatesService = new CollectionTemplatesService()
