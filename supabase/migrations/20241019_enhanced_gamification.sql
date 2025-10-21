-- Enhanced Gamification System Migration
-- Add new tables and columns for achievements, enhanced leaderboards, and progress tracking

-- Add new columns to existing contributions table for enhanced tracking
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  points_earned INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at);
CREATE INDEX IF NOT EXISTS idx_contributions_metadata ON contributions USING GIN(metadata);

-- Add RLS policies for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view others' achievements (for leaderboards)
CREATE POLICY "Users can view others achievements" ON user_achievements
  FOR SELECT USING (true);

-- Only system can insert achievements (through service role)
CREATE POLICY "System can insert achievements" ON user_achievements
  FOR INSERT WITH CHECK (true);

-- Update the increment_user_points function to handle enhanced badge levels
CREATE OR REPLACE FUNCTION increment_user_points(user_id UUID, points INT)
RETURNS void AS $$
DECLARE
  current_points INT;
BEGIN
  -- Update user points
  UPDATE users 
  SET points = COALESCE(points, 0) + increment_user_points.points,
      updated_at = NOW()
  WHERE id = user_id
  RETURNING points INTO current_points;
  
  -- Update badge level based on new points total
  UPDATE users SET badge_level = 
    CASE 
      WHEN current_points >= 1000 THEN 'Master'
      WHEN current_points >= 500 THEN 'Expert'
      WHEN current_points >= 200 THEN 'Advanced'
      WHEN current_points >= 50 THEN 'Intermediate'
      ELSE 'Freshman'
    END,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get leaderboard with enhanced stats
CREATE OR REPLACE FUNCTION get_leaderboard(
  department_filter TEXT DEFAULT NULL,
  course_filter TEXT DEFAULT NULL,
  limit_count INT DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  department TEXT,
  total_points INT,
  uploads_count BIGINT,
  collections_count BIGINT,
  badge_level TEXT,
  rank BIGINT,
  recent_activity INT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      u.id,
      u.full_name,
      u.department,
      COALESCE(u.points, 0) as total_points,
      u.badge_level,
      COALESCE(resource_counts.uploads_count, 0) as uploads_count,
      COALESCE(collection_counts.collections_count, 0) as collections_count,
      COALESCE(recent_points.recent_activity, 0) as recent_activity
    FROM users u
    LEFT JOIN (
      SELECT uploaded_by, COUNT(*) as uploads_count
      FROM resources
      GROUP BY uploaded_by
    ) resource_counts ON u.id = resource_counts.uploaded_by
    LEFT JOIN (
      SELECT created_by, COUNT(*) as collections_count
      FROM collections
      GROUP BY created_by
    ) collection_counts ON u.id = collection_counts.created_by
    LEFT JOIN (
      SELECT 
        user_id, 
        SUM(points_earned) as recent_activity
      FROM contributions
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY user_id
    ) recent_points ON u.id = recent_points.user_id
    WHERE 
      (department_filter IS NULL OR u.department = department_filter)
      -- Course filtering would require additional schema changes
    ORDER BY total_points DESC, uploads_count DESC
    LIMIT limit_count
  )
  SELECT 
    us.id as user_id,
    us.full_name,
    us.department,
    us.total_points,
    us.uploads_count,
    us.collections_count,
    us.badge_level,
    ROW_NUMBER() OVER (ORDER BY us.total_points DESC, us.uploads_count DESC) as rank,
    us.recent_activity
  FROM user_stats us;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user progress and achievements
CREATE OR REPLACE FUNCTION get_user_progress(target_user_id UUID)
RETURNS TABLE (
  total_points INT,
  current_level TEXT,
  achievements_count BIGINT,
  uploads_count BIGINT,
  collections_count BIGINT,
  weekly_points INT,
  weekly_actions BIGINT,
  consecutive_days INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.points, 0) as total_points,
    u.badge_level as current_level,
    COALESCE(achievement_counts.achievements_count, 0) as achievements_count,
    COALESCE(resource_counts.uploads_count, 0) as uploads_count,
    COALESCE(collection_counts.collections_count, 0) as collections_count,
    COALESCE(weekly_stats.weekly_points, 0) as weekly_points,
    COALESCE(weekly_stats.weekly_actions, 0) as weekly_actions,
    0 as consecutive_days -- This would need more complex logic
  FROM users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) as achievements_count
    FROM user_achievements
    WHERE user_id = target_user_id
    GROUP BY user_id
  ) achievement_counts ON u.id = achievement_counts.user_id
  LEFT JOIN (
    SELECT uploaded_by, COUNT(*) as uploads_count
    FROM resources
    WHERE uploaded_by = target_user_id
    GROUP BY uploaded_by
  ) resource_counts ON u.id = resource_counts.uploaded_by
  LEFT JOIN (
    SELECT created_by, COUNT(*) as collections_count
    FROM collections
    WHERE created_by = target_user_id
    GROUP BY created_by
  ) collection_counts ON u.id = collection_counts.created_by
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(points_earned) as weekly_points,
      COUNT(*) as weekly_actions
    FROM contributions
    WHERE user_id = target_user_id 
      AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY user_id
  ) weekly_stats ON u.id = weekly_stats.user_id
  WHERE u.id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to award achievement
CREATE OR REPLACE FUNCTION award_achievement(
  target_user_id UUID,
  achievement_id TEXT,
  points_earned INT
)
RETURNS void AS $$
BEGIN
  -- Insert achievement record
  INSERT INTO user_achievements (user_id, achievement_id, points_earned)
  VALUES (target_user_id, achievement_id, points_earned)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
  
  -- Award bonus points
  PERFORM increment_user_points(target_user_id, points_earned);
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    target_user_id,
    'achievement',
    'Achievement Unlocked!',
    'You earned a new achievement: ' || achievement_id,
    jsonb_build_object(
      'achievement_id', achievement_id,
      'points_earned', points_earned
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;