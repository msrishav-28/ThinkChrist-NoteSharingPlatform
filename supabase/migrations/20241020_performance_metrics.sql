-- Create performance_metrics table for tracking system performance
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit VARCHAR(20) NOT NULL DEFAULT 'ms',
  context JSONB DEFAULT '{}',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id) WHERE session_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_created_at ON performance_metrics(metric_name, created_at DESC);

-- Index for context queries (using GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_performance_metrics_context_gin ON performance_metrics USING gin(context);

-- Create a function to clean up old performance metrics
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get performance statistics
CREATE OR REPLACE FUNCTION get_performance_stats(
  metric_name_param VARCHAR(100),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  end_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  avg_value DECIMAL,
  median_value DECIMAL,
  p95_value DECIMAL,
  p99_value DECIMAL,
  min_value DECIMAL,
  max_value DECIMAL,
  count_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      metric_value,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) AS median,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) AS p99
    FROM performance_metrics 
    WHERE metric_name = metric_name_param
      AND created_at >= start_time 
      AND created_at <= end_time
  )
  SELECT 
    AVG(metric_value)::DECIMAL AS avg_value,
    MAX(median)::DECIMAL AS median_value,
    MAX(p95)::DECIMAL AS p95_value,
    MAX(p99)::DECIMAL AS p99_value,
    MIN(metric_value)::DECIMAL AS min_value,
    MAX(metric_value)::DECIMAL AS max_value,
    COUNT(*)::BIGINT AS count_value
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
  threshold_ms DECIMAL DEFAULT 1000,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  query_type VARCHAR,
  table_name VARCHAR,
  avg_execution_time DECIMAL,
  max_execution_time DECIMAL,
  query_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (context->>'query_type')::VARCHAR AS query_type,
    (context->>'table_name')::VARCHAR AS table_name,
    AVG(metric_value)::DECIMAL AS avg_execution_time,
    MAX(metric_value)::DECIMAL AS max_execution_time,
    COUNT(*)::BIGINT AS query_count
  FROM performance_metrics 
  WHERE metric_name = 'database_query'
    AND metric_value >= threshold_ms
    AND context->>'query_type' IS NOT NULL
    AND context->>'table_name' IS NOT NULL
    AND created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY context->>'query_type', context->>'table_name'
  ORDER BY avg_execution_time DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get popular tags for caching optimization
CREATE OR REPLACE FUNCTION get_popular_tags(
  search_term VARCHAR DEFAULT '',
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  tag_name VARCHAR,
  usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tag::VARCHAR AS tag_name,
    COUNT(*)::BIGINT AS usage_count
  FROM (
    SELECT unnest(tags) AS tag
    FROM resources
    WHERE CASE 
      WHEN search_term = '' THEN TRUE
      ELSE unnest(tags) ILIKE '%' || search_term || '%'
    END
  ) tag_counts
  GROUP BY tag
  ORDER BY usage_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for performance metrics
-- Only allow authenticated users to read their own metrics or admins to read all
CREATE POLICY "Users can read own performance metrics" ON performance_metrics
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only allow system/admin to insert performance metrics
CREATE POLICY "System can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'system')
    ) OR
    auth.uid() IS NULL -- Allow system inserts without auth
  );

-- Create a view for performance dashboard
CREATE OR REPLACE VIEW performance_dashboard_view AS
SELECT 
  metric_name,
  DATE_TRUNC('hour', created_at) AS hour,
  AVG(metric_value) AS avg_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95_value,
  COUNT(*) AS count_value
FROM performance_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY metric_name, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Grant permissions
GRANT SELECT ON performance_dashboard_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_tags TO authenticated;

-- Comment on table and functions
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics for monitoring system health';
COMMENT ON FUNCTION get_performance_stats IS 'Calculate performance statistics for a given metric';
COMMENT ON FUNCTION get_slow_queries IS 'Get slow database queries for optimization';
COMMENT ON FUNCTION cleanup_old_performance_metrics IS 'Clean up old performance metrics to manage storage';