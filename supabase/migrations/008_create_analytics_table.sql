-- Privacy-First Analytics Events Table
-- Stores anonymous analytics data for self-hosted tracking
-- NO personally identifiable information (PII) should be stored

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  session_id TEXT, -- Anonymous session, not linked to user
  page_path TEXT,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  search_query TEXT, -- Truncated, sanitized search terms
  device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_page_path ON analytics_events(page_path);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "Only admins can view analytics" 
  ON analytics_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert analytics events" 
  ON analytics_events FOR INSERT 
  WITH CHECK (true);

-- Nobody can update or delete analytics
-- This ensures data integrity

-- Add role column to users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END $$;

-- Create view for aggregated analytics (no individual tracking)
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
GROUP BY DATE_TRUNC('day', created_at), event_type
ORDER BY date DESC, event_count DESC;

-- Grant access to summary view for admins via RLS on base table
