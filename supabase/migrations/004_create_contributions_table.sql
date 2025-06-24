-- Create contributions table for tracking user activity
CREATE TABLE contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('upload', 'vote', 'download')),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_contributions_user_id ON contributions(user_id);

-- Create RLS policies
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions" 
  ON contributions FOR SELECT 
  USING (auth.uid() = user_id);