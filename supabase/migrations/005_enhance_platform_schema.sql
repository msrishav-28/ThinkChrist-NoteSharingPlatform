-- Platform Enhancement: Database Schema Enhancement
-- This migration extends the existing resources table and adds new tables for enhanced functionality

-- Extend existing resources table with new columns
ALTER TABLE resources 
ADD COLUMN resource_type VARCHAR(50) DEFAULT 'document',
ADD COLUMN external_url TEXT,
ADD COLUMN link_preview JSONB,
ADD COLUMN estimated_time INTEGER,
ADD COLUMN difficulty_level VARCHAR(20),
ADD COLUMN content_metadata JSONB DEFAULT '{}',
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN views INTEGER DEFAULT 0;

-- Update existing resources to have proper resource_type
UPDATE resources SET resource_type = 'document' WHERE resource_type IS NULL;

-- Make file_url nullable since we now support external links
ALTER TABLE resources ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE resources ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE resources ALTER COLUMN file_size DROP NOT NULL;
ALTER TABLE resources ALTER COLUMN file_type DROP NOT NULL;

-- Add check constraint for resource_type
ALTER TABLE resources ADD CONSTRAINT check_resource_type 
  CHECK (resource_type IN ('document', 'video', 'link', 'code', 'article'));

-- Add check constraint for difficulty_level
ALTER TABLE resources ADD CONSTRAINT check_difficulty_level 
  CHECK (difficulty_level IS NULL OR difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- Create collections table
CREATE TABLE collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  is_collaborative BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_resources junction table
CREATE TABLE collection_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, resource_id)
);

-- Create user_preferences table
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  notification_settings JSONB DEFAULT '{"email_digest": true, "new_resources": true, "votes_received": true, "achievements": true}',
  recommendation_settings JSONB DEFAULT '{"enable_recommendations": true, "track_interactions": true}',
  privacy_settings JSONB DEFAULT '{"profile_visibility": "public", "activity_visibility": "public"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_interactions table for tracking user behavior
CREATE TABLE user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,
  interaction_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint for interaction_type
ALTER TABLE user_interactions ADD CONSTRAINT check_interaction_type 
  CHECK (interaction_type IN ('view', 'download', 'share', 'bookmark', 'search_click', 'preview_click'));

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint for notification type
ALTER TABLE notifications ADD CONSTRAINT check_notification_type 
  CHECK (type IN ('achievement', 'vote_received', 'new_resource', 'collection_shared', 'system'));

-- Create indexes for performance optimization

-- Resources table indexes
CREATE INDEX idx_resources_resource_type ON resources(resource_type);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX idx_resources_difficulty_level ON resources(difficulty_level);
CREATE INDEX idx_resources_estimated_time ON resources(estimated_time);
CREATE INDEX idx_resources_views ON resources(views);
CREATE INDEX idx_resources_created_at ON resources(created_at);

-- Collections table indexes
CREATE INDEX idx_collections_created_by ON collections(created_by);
CREATE INDEX idx_collections_is_public ON collections(is_public);
CREATE INDEX idx_collections_tags ON collections USING GIN(tags);
CREATE INDEX idx_collections_created_at ON collections(created_at);

-- Collection_resources table indexes
CREATE INDEX idx_collection_resources_collection_id ON collection_resources(collection_id);
CREATE INDEX idx_collection_resources_resource_id ON collection_resources(resource_id);
CREATE INDEX idx_collection_resources_order_index ON collection_resources(order_index);

-- User_preferences table indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- User_interactions table indexes
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_resource_id ON user_interactions(resource_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);

-- Notifications table indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security (RLS) for new tables

-- Collections RLS
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public collections" 
  ON collections FOR SELECT 
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create collections" 
  ON collections FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Users can update own collections" 
  ON collections FOR UPDATE 
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own collections" 
  ON collections FOR DELETE 
  USING (auth.uid() = created_by);

-- Collection_resources RLS
ALTER TABLE collection_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collection resources if they can view the collection" 
  ON collection_resources FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_resources.collection_id 
      AND (collections.is_public = true OR collections.created_by = auth.uid())
    )
  );

CREATE POLICY "Collection owners can manage collection resources" 
  ON collection_resources FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_resources.collection_id 
      AND collections.created_by = auth.uid()
    )
  );

-- User_preferences RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" 
  ON user_preferences 
  USING (auth.uid() = user_id);

-- User_interactions RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions" 
  ON user_interactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interactions" 
  ON user_interactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_resources_updated_at 
  BEFORE UPDATE ON resources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at 
  BEFORE UPDATE ON collections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user preferences when a user is created
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to create user preferences automatically
CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();