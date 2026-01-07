-- Add collaboration features to collections
-- This migration adds tables and functionality for collaborative collection editing

-- Create collaboration_invitations table
CREATE TABLE collaboration_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_user_email TEXT NOT NULL,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) DEFAULT 'edit' CHECK (permission_level IN ('view', 'edit', 'admin')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create collaboration_activities table for tracking changes
CREATE TABLE collaboration_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'resource_added', 'resource_removed', 'resource_reordered', 
    'collection_updated', 'user_joined', 'notes_updated'
  )),
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collection_collaborators table for explicit collaborator management
CREATE TABLE collection_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) DEFAULT 'edit' CHECK (permission_level IN ('view', 'edit', 'admin')),
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_collaboration_invitations_collection_id ON collaboration_invitations(collection_id);
CREATE INDEX idx_collaboration_invitations_invited_user_id ON collaboration_invitations(invited_user_id);
CREATE INDEX idx_collaboration_invitations_status ON collaboration_invitations(status);
CREATE INDEX idx_collaboration_invitations_expires_at ON collaboration_invitations(expires_at);

CREATE INDEX idx_collaboration_activities_collection_id ON collaboration_activities(collection_id);
CREATE INDEX idx_collaboration_activities_user_id ON collaboration_activities(user_id);
CREATE INDEX idx_collaboration_activities_created_at ON collaboration_activities(created_at);

CREATE INDEX idx_collection_collaborators_collection_id ON collection_collaborators(collection_id);
CREATE INDEX idx_collection_collaborators_user_id ON collection_collaborators(user_id);
CREATE INDEX idx_collection_collaborators_last_active ON collection_collaborators(last_active);

-- Enable RLS for new tables
ALTER TABLE collaboration_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_invitations
CREATE POLICY "Users can view invitations sent to them" 
  ON collaboration_invitations FOR SELECT 
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

CREATE POLICY "Collection owners can create invitations" 
  ON collaboration_invitations FOR INSERT 
  WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collaboration_invitations.collection_id 
      AND collections.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own invitations" 
  ON collaboration_invitations FOR UPDATE 
  USING (auth.uid() = invited_user_id);

-- RLS Policies for collaboration_activities
CREATE POLICY "Users can view activities for collections they can access" 
  ON collaboration_activities FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collaboration_activities.collection_id 
      AND (
        collections.is_public = true OR 
        collections.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collection_collaborators 
          WHERE collection_collaborators.collection_id = collections.id 
          AND collection_collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create activities" 
  ON collaboration_activities FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for collection_collaborators
CREATE POLICY "Users can view collaborators for accessible collections" 
  ON collection_collaborators FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_collaborators.collection_id 
      AND (
        collections.is_public = true OR 
        collections.created_by = auth.uid() OR
        collection_collaborators.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Collection owners can manage collaborators" 
  ON collection_collaborators FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_collaborators.collection_id 
      AND collections.created_by = auth.uid()
    )
  );

-- Function to automatically add collection owner as admin collaborator
CREATE OR REPLACE FUNCTION add_collection_owner_as_collaborator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO collection_collaborators (collection_id, user_id, permission_level, added_by)
    VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to add collection owner as collaborator
CREATE TRIGGER add_collection_owner_collaborator_trigger
  AFTER INSERT ON collections
  FOR EACH ROW EXECUTE FUNCTION add_collection_owner_as_collaborator();

-- Function to log collaboration activities automatically
CREATE OR REPLACE FUNCTION log_collection_resource_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO collaboration_activities (
            collection_id, 
            user_id, 
            user_name, 
            activity_type, 
            activity_data
        )
        SELECT 
            NEW.collection_id,
            auth.uid(),
            users.full_name,
            'resource_added',
            jsonb_build_object(
                'resource_id', NEW.resource_id,
                'order_index', NEW.order_index
            )
        FROM users 
        WHERE users.id = auth.uid();
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO collaboration_activities (
            collection_id, 
            user_id, 
            user_name, 
            activity_type, 
            activity_data
        )
        SELECT 
            OLD.collection_id,
            auth.uid(),
            users.full_name,
            'resource_removed',
            jsonb_build_object('resource_id', OLD.resource_id)
        FROM users 
        WHERE users.id = auth.uid();
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' AND OLD.order_index != NEW.order_index THEN
        INSERT INTO collaboration_activities (
            collection_id, 
            user_id, 
            user_name, 
            activity_type, 
            activity_data
        )
        SELECT 
            NEW.collection_id,
            auth.uid(),
            users.full_name,
            'resource_reordered',
            jsonb_build_object(
                'resource_id', NEW.resource_id,
                'old_order', OLD.order_index,
                'new_order', NEW.order_index
            )
        FROM users 
        WHERE users.id = auth.uid();
        
        RETURN NEW;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to log collection resource activities
CREATE TRIGGER log_collection_resource_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON collection_resources
  FOR EACH ROW EXECUTE FUNCTION log_collection_resource_activity();

-- Function to log collection updates
CREATE OR REPLACE FUNCTION log_collection_update_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if significant fields changed
    IF OLD.title != NEW.title OR 
       OLD.description != NEW.description OR 
       OLD.is_public != NEW.is_public OR 
       OLD.is_collaborative != NEW.is_collaborative OR
       OLD.tags != NEW.tags THEN
        
        INSERT INTO collaboration_activities (
            collection_id, 
            user_id, 
            user_name, 
            activity_type, 
            activity_data
        )
        SELECT 
            NEW.id,
            auth.uid(),
            users.full_name,
            'collection_updated',
            jsonb_build_object(
                'changes', jsonb_build_object(
                    'title_changed', OLD.title != NEW.title,
                    'description_changed', OLD.description != NEW.description,
                    'visibility_changed', OLD.is_public != NEW.is_public,
                    'collaboration_changed', OLD.is_collaborative != NEW.is_collaborative,
                    'tags_changed', OLD.tags != NEW.tags
                )
            )
        FROM users 
        WHERE users.id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to log collection updates
CREATE TRIGGER log_collection_update_activity_trigger
  AFTER UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION log_collection_update_activity();

-- Function to update collaborator last_active timestamp
CREATE OR REPLACE FUNCTION update_collaborator_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE collection_collaborators 
    SET last_active = NOW()
    WHERE collection_id = NEW.collection_id 
    AND user_id = auth.uid();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update collaborator activity
CREATE TRIGGER update_collaborator_activity_trigger
  AFTER INSERT ON collaboration_activities
  FOR EACH ROW EXECUTE FUNCTION update_collaborator_activity();

-- Function to cleanup expired invitations (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
BEGIN
    UPDATE collaboration_invitations 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    RETURN (SELECT COUNT(*) FROM collaboration_invitations WHERE status = 'expired');
END;
$$ language 'plpgsql';

-- Add notes column to collection_resources if not exists (for collaborative notes)
ALTER TABLE collection_resources 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to update notes timestamp
CREATE OR REPLACE FUNCTION update_collection_resource_notes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
        NEW.updated_by = auth.uid();
        NEW.updated_at = NOW();
        
        -- Log notes update activity
        INSERT INTO collaboration_activities (
            collection_id, 
            user_id, 
            user_name, 
            activity_type, 
            activity_data
        )
        SELECT 
            NEW.collection_id,
            auth.uid(),
            users.full_name,
            'notes_updated',
            jsonb_build_object(
                'resource_id', NEW.resource_id,
                'has_notes', NEW.notes IS NOT NULL AND NEW.notes != ''
            )
        FROM users 
        WHERE users.id = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collection_resource_notes_trigger
  BEFORE UPDATE ON collection_resources
  FOR EACH ROW EXECUTE FUNCTION update_collection_resource_notes();