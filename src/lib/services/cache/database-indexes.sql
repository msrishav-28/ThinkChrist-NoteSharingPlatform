-- Database indexes for improved link preview cache performance
-- These should be run as database migrations

-- Index for link_previews table URL lookups (primary cache key)
CREATE INDEX IF NOT EXISTS idx_link_previews_url ON link_previews(url);

-- Index for link_previews cached_at for TTL cleanup
CREATE INDEX IF NOT EXISTS idx_link_previews_cached_at ON link_previews(cached_at);

-- Index for link_previews type for analytics and filtering
CREATE INDEX IF NOT EXISTS idx_link_previews_type ON link_previews(type);

-- Composite index for type and cached_at for efficient type-based cleanup
CREATE INDEX IF NOT EXISTS idx_link_previews_type_cached_at ON link_previews(type, cached_at);

-- Index for title search (if search functionality is needed)
CREATE INDEX IF NOT EXISTS idx_link_previews_title_gin ON link_previews USING gin(to_tsvector('english', title));

-- Index for description search (if search functionality is needed)
CREATE INDEX IF NOT EXISTS idx_link_previews_description_gin ON link_previews USING gin(to_tsvector('english', description));

-- Performance optimization indexes for resources table (for search caching)
-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_resources_title_gin ON resources USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_resources_description_gin ON resources USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_resources_subject_gin ON resources USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_resources_topic_gin ON resources USING gin(to_tsvector('english', topic));

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_resources_dept_course_semester ON resources(department, course, semester);
CREATE INDEX IF NOT EXISTS idx_resources_type_dept ON resources(resource_type, department);
CREATE INDEX IF NOT EXISTS idx_resources_created_at_dept ON resources(created_at DESC, department);

-- Index for tags array operations
CREATE INDEX IF NOT EXISTS idx_resources_tags_gin ON resources USING gin(tags);

-- Index for difficulty level filtering
CREATE INDEX IF NOT EXISTS idx_resources_difficulty ON resources(difficulty_level) WHERE difficulty_level IS NOT NULL;

-- Composite index for popularity-based queries
CREATE INDEX IF NOT EXISTS idx_resources_popularity ON resources(upvotes DESC, downloads DESC, views DESC, created_at DESC);

-- Index for user interactions (for recommendation caching)
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type ON user_interactions(user_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_resource_type ON user_interactions(resource_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

-- Composite index for collaborative filtering queries
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_resource ON user_interactions(user_id, resource_id, interaction_type);

-- Index for search analytics (if implemented)
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query) WHERE query IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_created ON search_analytics(user_id, created_at DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_resources_public_recent ON resources(created_at DESC) 
  WHERE is_verified = true;

CREATE INDEX IF NOT EXISTS idx_resources_by_uploader ON resources(uploaded_by, created_at DESC);

-- Index for collection operations
CREATE INDEX IF NOT EXISTS idx_collection_resources_collection ON collection_resources(collection_id, order_index);
CREATE INDEX IF NOT EXISTS idx_collection_resources_resource ON collection_resources(resource_id);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Performance monitoring indexes
CREATE INDEX IF NOT EXISTS idx_resources_performance_metrics ON resources(created_at, upvotes, downloads, views);