-- Migration for search enhancements and analytics

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_results TEXT[] DEFAULT '{}',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  filters_used JSONB DEFAULT '{}',
  search_time INTEGER NOT NULL DEFAULT 0, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);

-- Create function to get popular tags with search
CREATE OR REPLACE FUNCTION get_popular_tags(search_term TEXT DEFAULT '', result_limit INTEGER DEFAULT 10)
RETURNS TABLE(tag_name TEXT, usage_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest_tags.tag AS tag_name,
    COUNT(*) AS usage_count
  FROM (
    SELECT unnest(tags) AS tag
    FROM resources
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  ) AS unnest_tags
  WHERE 
    CASE 
      WHEN search_term = '' THEN TRUE
      ELSE unnest_tags.tag ILIKE '%' || search_term || '%'
    END
  GROUP BY unnest_tags.tag
  ORDER BY usage_count DESC, tag_name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function for full-text search with ranking
CREATE OR REPLACE FUNCTION search_resources_ranked(
  search_query TEXT,
  resource_types TEXT[] DEFAULT NULL,
  departments TEXT[] DEFAULT NULL,
  courses TEXT[] DEFAULT NULL,
  tags_filter TEXT[] DEFAULT NULL,
  difficulty_levels TEXT[] DEFAULT NULL,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  resource_type TEXT,
  department TEXT,
  course TEXT,
  semester INTEGER,
  subject TEXT,
  topic TEXT,
  tags TEXT[],
  difficulty_level TEXT,
  upvotes INTEGER,
  downvotes INTEGER,
  downloads INTEGER,
  views INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.resource_type,
    r.department,
    r.course,
    r.semester,
    r.subject,
    r.topic,
    r.tags,
    r.difficulty_level,
    r.upvotes,
    r.downvotes,
    r.downloads,
    r.views,
    r.created_at,
    -- Simple ranking based on text match and popularity
    (
      CASE 
        WHEN r.title ILIKE '%' || search_query || '%' THEN 3.0
        WHEN r.description ILIKE '%' || search_query || '%' THEN 2.0
        WHEN r.subject ILIKE '%' || search_query || '%' THEN 1.5
        WHEN r.topic ILIKE '%' || search_query || '%' THEN 1.0
        ELSE 0.5
      END +
      -- Boost popular resources
      (r.upvotes * 0.1) +
      (r.downloads * 0.05) +
      (r.views * 0.01)
    )::REAL AS search_rank
  FROM resources r
  WHERE 
    -- Text search conditions
    (
      search_query = '' OR
      r.title ILIKE '%' || search_query || '%' OR
      r.description ILIKE '%' || search_query || '%' OR
      r.subject ILIKE '%' || search_query || '%' OR
      r.topic ILIKE '%' || search_query || '%'
    )
    -- Filter conditions
    AND (resource_types IS NULL OR r.resource_type = ANY(resource_types))
    AND (departments IS NULL OR r.department = ANY(departments))
    AND (courses IS NULL OR r.course = ANY(courses))
    AND (tags_filter IS NULL OR r.tags && tags_filter)
    AND (difficulty_levels IS NULL OR r.difficulty_level = ANY(difficulty_levels))
  ORDER BY search_rank DESC, r.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;

-- Create function to get search facets
CREATE OR REPLACE FUNCTION get_search_facets(search_query TEXT DEFAULT '')
RETURNS TABLE(
  facet_type TEXT,
  facet_value TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  -- Resource types facet
  SELECT 
    'resource_type'::TEXT AS facet_type,
    r.resource_type AS facet_value,
    COUNT(*) AS count
  FROM resources r
  WHERE 
    search_query = '' OR
    r.title ILIKE '%' || search_query || '%' OR
    r.description ILIKE '%' || search_query || '%' OR
    r.subject ILIKE '%' || search_query || '%' OR
    r.topic ILIKE '%' || search_query || '%'
  GROUP BY r.resource_type
  
  UNION ALL
  
  -- Departments facet
  SELECT 
    'department'::TEXT AS facet_type,
    r.department AS facet_value,
    COUNT(*) AS count
  FROM resources r
  WHERE 
    search_query = '' OR
    r.title ILIKE '%' || search_query || '%' OR
    r.description ILIKE '%' || search_query || '%' OR
    r.subject ILIKE '%' || search_query || '%' OR
    r.topic ILIKE '%' || search_query || '%'
  GROUP BY r.department
  
  UNION ALL
  
  -- Courses facet
  SELECT 
    'course'::TEXT AS facet_type,
    r.course AS facet_value,
    COUNT(*) AS count
  FROM resources r
  WHERE 
    search_query = '' OR
    r.title ILIKE '%' || search_query || '%' OR
    r.description ILIKE '%' || search_query || '%' OR
    r.subject ILIKE '%' || search_query || '%' OR
    r.topic ILIKE '%' || search_query || '%'
  GROUP BY r.course
  
  UNION ALL
  
  -- Difficulty levels facet
  SELECT 
    'difficulty'::TEXT AS facet_type,
    r.difficulty_level AS facet_value,
    COUNT(*) AS count
  FROM resources r
  WHERE 
    r.difficulty_level IS NOT NULL
    AND (
      search_query = '' OR
      r.title ILIKE '%' || search_query || '%' OR
      r.description ILIKE '%' || search_query || '%' OR
      r.subject ILIKE '%' || search_query || '%' OR
      r.topic ILIKE '%' || search_query || '%'
    )
  GROUP BY r.difficulty_level
  
  UNION ALL
  
  -- Tags facet (unnest tags array)
  SELECT 
    'tag'::TEXT AS facet_type,
    unnest_tags.tag AS facet_value,
    COUNT(*) AS count
  FROM (
    SELECT unnest(r.tags) AS tag
    FROM resources r
    WHERE 
      r.tags IS NOT NULL 
      AND array_length(r.tags, 1) > 0
      AND (
        search_query = '' OR
        r.title ILIKE '%' || search_query || '%' OR
        r.description ILIKE '%' || search_query || '%' OR
        r.subject ILIKE '%' || search_query || '%' OR
        r.topic ILIKE '%' || search_query || '%'
      )
  ) AS unnest_tags
  GROUP BY unnest_tags.tag
  ORDER BY facet_type, count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_resources_title_gin ON resources USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_resources_description_gin ON resources USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_resources_subject_gin ON resources USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_resources_topic_gin ON resources USING gin(to_tsvector('english', topic));

-- Create composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_resources_type_dept ON resources(resource_type, department);
CREATE INDEX IF NOT EXISTS idx_resources_course_semester ON resources(course, semester);
CREATE INDEX IF NOT EXISTS idx_resources_difficulty ON resources(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_resources_tags_gin ON resources USING gin(tags);

-- Create index for popularity-based sorting
CREATE INDEX IF NOT EXISTS idx_resources_popularity ON resources(upvotes DESC, downloads DESC, views DESC, created_at DESC);

-- Enable Row Level Security on search_analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for search_analytics (users can only see their own analytics)
CREATE POLICY "Users can view own search analytics" ON search_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search analytics" ON search_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON search_analytics TO authenticated;
GRANT INSERT ON search_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_tags(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_resources_ranked(TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_facets(TEXT) TO authenticated;