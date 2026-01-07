// Metadata type definitions for type safety
// Index signature allows additional properties while still providing type hints
export interface ContentMetadata {
  wordCount?: number
  pageCount?: number
  duration?: number
  resolution?: { width: number; height: number }
  linesOfCode?: number
  language?: string
  encoding?: string
  textContent?: string
  estimatedTime?: number
  [key: string]: any
}

export interface LinkPreviewMetadata {
  // YouTube-specific properties
  videoId?: string
  channelName?: string
  channelTitle?: string
  channelId?: string
  viewCount?: number
  likeCount?: number
  subscriberCount?: number
  publishedAt?: string
  duration?: number
  durationFormatted?: string

  // GitHub-specific properties
  owner?: string
  repo?: string
  full_name?: string
  stars?: number
  forks?: number
  issues?: number
  size?: number
  topics?: string[]
  license?: string
  created_at?: string
  updated_at?: string
  pushed_at?: string
  default_branch?: string
  archived?: boolean
  private?: boolean
  clone_url?: string
  readme_excerpt?: string
  fallback?: boolean
  url?: string

  // Article/general properties
  language?: string
  author?: string
  publishDate?: string
  readingTime?: number
  tags?: string[]
  domain?: string
  site_name?: string

  // Allow additional properties for extensibility
  [key: string]: any
}

export interface InteractionData {
  searchQuery?: string
  searchFilters?: Record<string, string | number | boolean>
  sourceUrl?: string
  rating?: number
  reason?: string
  duration?: number
  scrollDepth?: number
  [key: string]: any
}

export interface NotificationData {
  resourceId?: string
  resourceTitle?: string
  achievement?: string
  points?: number
  voterId?: string
  voterName?: string
  voteType?: 'upvote' | 'downvote'
  collectionId?: string
  collectionTitle?: string
  systemMessage?: string
  [key: string]: any
}

export interface ResourceTypeMetadata {
  detectedFrom?: 'filename' | 'mimetype' | 'url' | 'content'
  platform?: string
  embedUrl?: string
  originalUrl?: string
  [key: string]: any
}

export interface User {
  id: string
  email: string
  full_name: string
  department: string
  semester: number
  points: number
  badge_level: string
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  title: string
  description: string | null

  // Enhanced resource type support
  resource_type: 'document' | 'video' | 'link' | 'code' | 'article'

  // File-based resources (now optional)
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string

  // Link-based resources
  external_url?: string
  link_preview?: LinkPreview

  // Enhanced metadata
  estimated_time?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  content_metadata: ContentMetadata
  tags: string[]

  // Existing fields
  department: string
  course: string
  semester: number
  subject: string
  topic: string | null
  uploaded_by: string
  uploader?: User
  upvotes: number
  downvotes: number
  downloads: number
  views: number
  is_verified: boolean
  created_at: string
  updated_at: string
  user_vote?: 'upvote' | 'downvote' | null
}

export interface Vote {
  id: string
  user_id: string
  resource_id: string
  vote_type: 'upvote' | 'downvote'
  created_at: string
}

export interface Contribution {
  id: string
  user_id: string
  type: 'upload' | 'vote' | 'download'
  resource_id: string
  points_earned: number
  created_at: string
}

export interface LeaderboardEntry {
  user_id: string
  full_name: string
  department: string
  total_points: number
  uploads_count: number
  badge_level: string
  rank: number
}

// Enhanced types for new functionality

export interface LinkPreview {
  title: string
  description: string
  thumbnail?: string
  favicon?: string
  type: 'youtube' | 'github' | 'article' | 'document' | 'generic'
  metadata: LinkPreviewMetadata
  cached_at: string
}

export interface Collection {
  id: string
  title: string
  description?: string
  created_by: string
  creator?: User
  is_public: boolean
  is_collaborative: boolean
  tags: string[]
  resources?: CollectionResource[]
  created_at: string
  updated_at: string
}

export interface CollectionResource {
  id: string
  collection_id: string
  resource_id: string
  resource?: Resource
  order_index: number
  notes?: string
  added_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  notification_settings: {
    email_digest: boolean
    new_resources: boolean
    votes_received: boolean
    achievements: boolean
  }
  recommendation_settings: {
    enable_recommendations: boolean
    track_interactions: boolean
  }
  privacy_settings: {
    profile_visibility: 'public' | 'private'
    activity_visibility: 'public' | 'private'
  }
  dashboard_settings?: {
    visible_widgets: string[]
    auto_refresh: boolean
    compact_mode: boolean
    refresh_interval: number
  }
  created_at: string
  updated_at: string
}

export interface UserInteraction {
  id: string
  user_id: string
  resource_id: string
  interaction_type: 'view' | 'download' | 'share' | 'bookmark' | 'search_click' | 'preview_click'
  interaction_data: InteractionData
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'achievement' | 'vote_received' | 'new_resource' | 'collection_shared' | 'system'
  title: string
  message?: string
  data: NotificationData
  is_read: boolean
  created_at: string
}

// Enhanced search and filtering types
export interface SearchFilters {
  resourceTypes?: ('document' | 'video' | 'link' | 'code' | 'article')[]
  departments?: string[]
  courses?: string[]
  semesters?: number[]
  tags?: string[]
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface SearchSuggestion {
  text: string
  type: 'query' | 'tag' | 'course' | 'department'
  count?: number
}

export interface SearchResults {
  resources: Resource[]
  total: number
  facets: {
    resourceTypes: { [key: string]: number }
    departments: { [key: string]: number }
    courses: { [key: string]: number }
    tags: { [key: string]: number }
    difficulty: { [key: string]: number }
  }
}

// Resource type detection and validation types
export type ResourceType = 'document' | 'video' | 'link' | 'code' | 'article'

export interface ResourceTypeDetectionResult {
  type: ResourceType
  confidence: number
  metadata?: ResourceTypeMetadata
}

export interface FileTypeInfo {
  extension: string
  mimeType: string
  category: ResourceType
}

export interface URLPatternMatch {
  pattern: RegExp
  type: ResourceType
  platform?: string
}