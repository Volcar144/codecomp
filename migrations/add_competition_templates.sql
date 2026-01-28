-- Migration: Add competition templates table
-- Run this SQL in your Supabase SQL Editor

-- Competition templates table for saving and reusing competition configurations
CREATE TABLE IF NOT EXISTS competition_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id VARCHAR(255) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE, -- Public templates can be used by anyone
  
  -- Template data (same structure as competitions)
  template_title VARCHAR(255),
  template_description TEXT,
  template_rules TEXT,
  allowed_languages TEXT[] DEFAULT ARRAY['python', 'javascript', 'java', 'cpp'],
  default_duration_hours INTEGER DEFAULT 24, -- Default competition duration
  
  -- Template test cases (stored as JSON for flexibility)
  test_cases JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  use_count INTEGER DEFAULT 0, -- Track how many times template has been used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_competition_templates_creator ON competition_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_competition_templates_public ON competition_templates(is_public) WHERE is_public = TRUE;

-- RLS policies
ALTER TABLE competition_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and public templates
CREATE POLICY "Users can view own and public templates" ON competition_templates
  FOR SELECT USING (creator_id = current_setting('app.current_user_id', true) OR is_public = TRUE);

-- Users can create their own templates
CREATE POLICY "Users can create templates" ON competition_templates
  FOR INSERT WITH CHECK (creator_id = current_setting('app.current_user_id', true));

-- Users can update their own templates
CREATE POLICY "Users can update own templates" ON competition_templates
  FOR UPDATE USING (creator_id = current_setting('app.current_user_id', true));

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates" ON competition_templates
  FOR DELETE USING (creator_id = current_setting('app.current_user_id', true));
