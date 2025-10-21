// Resource management feature types
// Re-export resource-related types from the main types file
export type {
  Resource,
  ResourceType,
  ResourceTypeDetectionResult,
  FileTypeInfo,
  URLPatternMatch,
  LinkPreview,
  Vote,
  Contribution,
  CollectionResource,
  UserInteraction,
  SearchFilters,
  SearchResults
} from '@/types'

// Import types for use in interfaces
import type { Resource } from '@/types'

// Resource-specific component prop types
export interface ResourceCardProps {
  resource: Resource
  onVote?: () => void
  showHighlighting?: boolean
  highlightQuery?: string
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
  showPreview?: boolean
  showMetadata?: boolean
}

export interface ResourceGridProps {
  resources: Resource[]
  loading?: boolean
  onResourceClick?: (resource: Resource) => void
  variant?: 'default' | 'compact' | 'detailed'
  layout?: 'grid' | 'list' | 'masonry'
  showPreviews?: boolean
  showMetadata?: boolean
  className?: string
}

export interface ResourceFiltersProps {
  onFilterChange: (filters: any) => void
}

export interface TagFiltersProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  department?: string
  course?: string
  className?: string
}