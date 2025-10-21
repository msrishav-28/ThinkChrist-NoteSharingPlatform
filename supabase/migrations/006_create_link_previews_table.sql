-- Create link_previews table for caching link preview data
CREATE TABLE link_previews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  favicon TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'generic',
  metadata JSONB DEFAULT '{}',
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint for preview type
ALTER TABLE link_previews ADD CONSTRAINT check_preview_type 
  CHECK (type IN ('youtube', 'github', 'article', 'document', 'generic'));

-- Create indexes for performance
CREATE INDEX idx_link_previews_url ON link_previews(url);
CREATE INDEX idx_link_previews_type ON link_previews(type);
CREATE INDEX idx_link_previews_cached_at ON link_previews(cached_at);

-- Enable Row Level Security
ALTER TABLE link_previews ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read cached previews
CREATE POLICY "Authenticated users can view link previews" 
  ON link_previews FOR SELECT 
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert/update previews (for caching)
CREATE POLICY "Authenticated users can cache link previews" 
  ON link_previews FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update link previews" 
  ON link_previews FOR UPDATE 
  TO authenticated
  USING (true);

-- Add trigger for updated_at column
CREATE TRIGGER update_link_previews_updated_at 
  BEFORE UPDATE ON link_previews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();