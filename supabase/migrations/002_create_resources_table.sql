-- Create resources table
CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  department TEXT NOT NULL,
  course TEXT NOT NULL,
  semester INTEGER NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_resources_department ON resources(department);
CREATE INDEX idx_resources_course ON resources(course);
CREATE INDEX idx_resources_subject ON resources(subject);
CREATE INDEX idx_resources_uploaded_by ON resources(uploaded_by);

-- Create RLS policies
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view resources" 
  ON resources FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert resources" 
  ON resources FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own resources" 
  ON resources FOR UPDATE 
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own resources" 
  ON resources FOR DELETE 
  USING (auth.uid() = uploaded_by);