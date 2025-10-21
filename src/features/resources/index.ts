// Resource management feature module exports
export * from './components'
export * from './hooks'
export * from './utils'

// Export types explicitly to avoid conflicts
export type {
  Resource,
  ResourceType,
  ResourceTypeDetectionResult,
  FileTypeInfo,
  URLPatternMatch,
  LinkPreview as LinkPreviewType,
  Vote,
  Contribution,
  CollectionResource,
  UserInteraction,
  SearchFilters,
  SearchResults,
  ResourceCardProps,
  ResourceGridProps,
  ResourceFiltersProps,
  TagFiltersProps
} from './types'