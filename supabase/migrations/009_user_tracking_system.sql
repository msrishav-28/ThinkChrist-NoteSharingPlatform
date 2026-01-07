-- User Tracking System Migration
-- Adds tables and columns for tracking user activity with consent

-- Add tracking_consent column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS tracking_consent BOOLEAN DEFAULT false;

-- Create user_tracking_logs table
CREATE TABLE IF NOT EXISTS user_tracking_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session/Request Info
    ip_address INET,
    user_agent TEXT,
    
    -- Parsed Device Info
    device_type VARCHAR(20), -- 'mobile', 'tablet', 'desktop'
    os VARCHAR(50),
    browser VARCHAR(50),
    
    -- Geolocation (from IP)
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    country_code VARCHAR(10),
    
    -- Activity Info
    activity_type VARCHAR(50) NOT NULL,
    -- Types: 'login', 'logout', 'page_view', 'resource_view', 'resource_upload', 
    --        'resource_download', 'search', 'vote', 'profile_update'
    activity_data JSONB DEFAULT '{}',
    page_path TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tracking_logs_user_id ON user_tracking_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_activity_type ON user_tracking_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_created_at ON user_tracking_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_ip_address ON user_tracking_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_country ON user_tracking_logs(country);

-- Enable RLS
ALTER TABLE user_tracking_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can insert/read (no user access)
-- This ensures users cannot see their own tracking data or others'
CREATE POLICY "Service role only for tracking logs"
    ON user_tracking_logs
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Create a function to check if user has tracking consent
CREATE OR REPLACE FUNCTION has_tracking_consent(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT tracking_consent 
        FROM users 
        WHERE id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to insert tracking log (bypasses RLS, checks consent internally)
CREATE OR REPLACE FUNCTION insert_tracking_log(
    p_user_id UUID,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_device_type TEXT,
    p_os TEXT,
    p_browser TEXT,
    p_city TEXT,
    p_state TEXT,
    p_country TEXT,
    p_country_code TEXT,
    p_activity_type TEXT,
    p_activity_data JSONB,
    p_page_path TEXT
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Check consent first
    IF NOT has_tracking_consent(p_user_id) THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO user_tracking_logs (
        user_id,
        ip_address,
        user_agent,
        device_type,
        os,
        browser,
        city,
        state,
        country,
        country_code,
        activity_type,
        activity_data,
        page_path
    ) VALUES (
        p_user_id,
        p_ip_address::INET,
        p_user_agent,
        p_device_type,
        p_os,
        p_browser,
        p_city,
        p_state,
        p_country,
        p_country_code,
        p_activity_type,
        p_activity_data,
        p_page_path
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index on tracking_consent for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_tracking_consent ON users(tracking_consent) WHERE tracking_consent = true;
