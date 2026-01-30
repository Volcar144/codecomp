-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by BetterAuth, but we'll reference it)
-- BetterAuth will create its own user table

-- Competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  rules TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  creator_id VARCHAR(255) NOT NULL,
  allowed_languages TEXT[] DEFAULT ARRAY['python', 'javascript', 'java', 'cpp'],
  status VARCHAR(50) DEFAULT 'draft',
  is_public BOOLEAN DEFAULT TRUE,
  invite_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  execution_time INTEGER, -- in milliseconds
  memory_used INTEGER, -- in KB
  error_message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution log table for rate limiting (daily execution counts)
CREATE TABLE IF NOT EXISTS execution_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient daily counting
CREATE INDEX IF NOT EXISTS idx_execution_log_user_date ON execution_log(user_id, created_at);

-- Auto-cleanup old execution logs (older than 2 days)
-- This keeps the table small while allowing daily limit checks
CREATE OR REPLACE FUNCTION cleanup_old_execution_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM execution_log WHERE created_at < NOW() - INTERVAL '2 days';
END;
$$ LANGUAGE plpgsql;

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  passed BOOLEAN DEFAULT FALSE,
  actual_output TEXT,
  execution_time INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Judges table
CREATE TABLE IF NOT EXISTS judges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'judge',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prizes table
CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rankings/Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  s.competition_id,
  s.user_id,
  MAX(s.score) as best_score,
  MIN(s.execution_time) as best_time,
  COUNT(s.id) as total_submissions,
  MAX(s.submitted_at) as last_submission,
  RANK() OVER (PARTITION BY s.competition_id ORDER BY MAX(s.score) DESC, MIN(s.execution_time) ASC) as rank
FROM submissions s
WHERE s.status = 'passed'
GROUP BY s.competition_id, s.user_id;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_competitions_creator ON competitions(creator_id);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_is_public ON competitions(is_public);
CREATE INDEX IF NOT EXISTS idx_submissions_competition ON submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_competition ON test_cases(competition_id);
CREATE INDEX IF NOT EXISTS idx_judges_competition ON judges(competition_id);
CREATE INDEX IF NOT EXISTS idx_prizes_competition ON prizes(competition_id);

-- =============================================================================
-- Family and Team Subscription Tables
-- =============================================================================

-- Family members table - tracks members of family plans
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id VARCHAR(255) NOT NULL, -- The family plan owner
  member_user_id VARCHAR(255) NOT NULL, -- The family member
  status VARCHAR(50) DEFAULT 'active', -- active, removed
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_user_id, member_user_id)
);

-- Family invitations table - pending invitations
CREATE TABLE IF NOT EXISTS family_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id VARCHAR(255) NOT NULL, -- The family plan owner
  email VARCHAR(255) NOT NULL, -- Email to invite
  token VARCHAR(255) NOT NULL UNIQUE, -- Invitation token
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, canceled
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table - organization/team info (must be created before team_members)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  owner_user_id VARCHAR(255) NOT NULL,
  subscription_id VARCHAR(255), -- Reference to BetterAuth subscription
  included_seats INTEGER DEFAULT 5,
  additional_seats INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members table - tracks members of team plans
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
  status VARCHAR(50) DEFAULT 'active', -- active, removed
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations table - pending invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- admin, member
  token VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, canceled
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for family/team tables
CREATE INDEX IF NOT EXISTS idx_family_members_owner ON family_members(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_member ON family_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_owner ON family_invitations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON family_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- Function to check if a user has Pro access (either directly or via family/team)
CREATE OR REPLACE FUNCTION user_has_pro_access(check_user_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
BEGIN
  -- Check for direct subscription (handled by app layer via BetterAuth)
  -- This function checks family/team membership

  -- Check if user is a family member with active status
  SELECT EXISTS(
    SELECT 1 FROM family_members fm
    JOIN subscription s ON s.reference_id = fm.owner_user_id
    WHERE fm.member_user_id = check_user_id
    AND fm.status = 'active'
    AND s.status = 'active'
    AND s.plan = 'family'
  ) INTO has_access;

  IF has_access THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a team member with active status
  SELECT EXISTS(
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN subscription s ON s.reference_id = t.owner_user_id
    WHERE tm.user_id = check_user_id
    AND tm.status = 'active'
    AND s.status = 'active'
    AND s.plan = 'team'
  ) INTO has_access;

  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired invitations (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE family_invitations 
  SET status = 'expired' 
  WHERE status = 'pending' AND expires_at < NOW();
  
  UPDATE team_invitations 
  SET status = 'expired' 
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- Competitions: Public competitions are visible to all, private only to creator
CREATE POLICY "Anyone can view public competitions or their own" ON competitions FOR SELECT USING (is_public = true OR auth.uid()::text = creator_id);
CREATE POLICY "Authenticated users can create competitions" ON competitions FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "Creators can update their competitions" ON competitions FOR UPDATE USING (auth.uid()::text = creator_id);
CREATE POLICY "Creators can delete their competitions" ON competitions FOR DELETE USING (auth.uid()::text = creator_id);

-- Submissions: Users can only see their own submissions, judges can see all
CREATE POLICY "Users can view their own submissions" ON submissions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create submissions" ON submissions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Test cases: Only visible to competition creators and judges
CREATE POLICY "Competition creators can manage test cases" ON test_cases FOR ALL USING (
  EXISTS (
    SELECT 1 FROM competitions WHERE id = test_cases.competition_id AND creator_id = auth.uid()::text
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PRIVATE ARENAS SCHEMA
-- =============================================

-- User GitHub tokens (stores OAuth tokens for repo access)
CREATE TABLE IF NOT EXISTS user_github_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'bearer',
  scope TEXT DEFAULT 'repo',
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Private Arenas table
CREATE TABLE IF NOT EXISTS arenas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id VARCHAR(255) NOT NULL,
  github_repo VARCHAR(255) NOT NULL, -- format: owner/repo
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT FALSE,
  invite_code VARCHAR(20),
  max_participants INTEGER,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, judging, completed
  judging_criteria TEXT,
  winner_id UUID, -- References arena_participants(id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Arena participants
CREATE TABLE IF NOT EXISTS arena_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  github_username VARCHAR(255),
  directory_path VARCHAR(500) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arena_id, user_id)
);

-- Arena judges
CREATE TABLE IF NOT EXISTS arena_judges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arena_id, user_id)
);

-- Arena scores (assigned by judges to participants directly)
CREATE TABLE IF NOT EXISTS arena_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arena_id UUID NOT NULL REFERENCES arenas(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES arena_participants(id) ON DELETE CASCADE,
  judge_id VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arena_id, participant_id, judge_id)
);

-- Interactive terminal sessions (for real-time code execution)
CREATE TABLE IF NOT EXISTS terminal_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  arena_id UUID REFERENCES arenas(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE, -- Piston session ID
  language VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, error, destroyed
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Arena leaderboard view
CREATE OR REPLACE VIEW arena_leaderboard AS
SELECT 
  asc2.arena_id,
  ap.user_id,
  ap.github_username,
  ap.directory_path,
  AVG(asc2.score)::DECIMAL(5,2) as avg_score,
  COUNT(DISTINCT asc2.judge_id) as judges_scored,
  MAX(asc2.updated_at) as last_scored,
  RANK() OVER (PARTITION BY asc2.arena_id ORDER BY AVG(asc2.score) DESC) as rank
FROM arena_scores asc2
JOIN arena_participants ap ON ap.id = asc2.participant_id
GROUP BY asc2.arena_id, ap.user_id, ap.github_username, ap.directory_path, ap.id;

-- Indexes for arenas
CREATE INDEX IF NOT EXISTS idx_arenas_creator ON arenas(creator_id);
CREATE INDEX IF NOT EXISTS idx_arenas_status ON arenas(status);
CREATE INDEX IF NOT EXISTS idx_arena_participants_arena ON arena_participants(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_participants_user ON arena_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_scores_participant ON arena_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_user_github_tokens_user ON user_github_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_user ON terminal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_arena ON terminal_sessions(arena_id);

-- RLS for arena tables
ALTER TABLE user_github_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_sessions ENABLE ROW LEVEL SECURITY;

-- User GitHub tokens: Users can only see/manage their own
CREATE POLICY "Users can view their own github tokens" ON user_github_tokens FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their github tokens" ON user_github_tokens FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their github tokens" ON user_github_tokens FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their github tokens" ON user_github_tokens FOR DELETE USING (auth.uid()::text = user_id);

-- Arenas: Anyone can view public arenas, only creator can manage
CREATE POLICY "Anyone can view public arenas" ON arenas FOR SELECT USING (is_public OR auth.uid()::text = creator_id);
CREATE POLICY "Authenticated users can create arenas" ON arenas FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "Creators can update their arenas" ON arenas FOR UPDATE USING (auth.uid()::text = creator_id);
CREATE POLICY "Creators can delete their arenas" ON arenas FOR DELETE USING (auth.uid()::text = creator_id);

-- Arena participants: Participants can see their own data
CREATE POLICY "Participants can view arena participants" ON arena_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM arenas WHERE id = arena_id AND (is_public OR creator_id = auth.uid()::text))
  OR user_id = auth.uid()::text
);
CREATE POLICY "Users can join arenas" ON arena_participants FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can leave arenas" ON arena_participants FOR DELETE USING (auth.uid()::text = user_id);

-- Arena judges: Anyone can view judges
CREATE POLICY "Anyone can view arena judges" ON arena_judges FOR SELECT USING (true);
CREATE POLICY "Creators can manage judges" ON arena_judges FOR ALL USING (
  EXISTS (SELECT 1 FROM arenas WHERE id = arena_id AND creator_id = auth.uid()::text)
);

-- Arena scores: Judges and creators can manage scores
CREATE POLICY "Anyone can view arena scores" ON arena_scores FOR SELECT USING (true);
CREATE POLICY "Judges can manage scores" ON arena_scores FOR ALL USING (
  auth.uid()::text = judge_id OR
  EXISTS (SELECT 1 FROM arenas WHERE id = arena_id AND creator_id = auth.uid()::text)
);

-- Terminal sessions: Users can only manage their own
CREATE POLICY "Users can view their terminal sessions" ON terminal_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create terminal sessions" ON terminal_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their terminal sessions" ON terminal_sessions FOR UPDATE USING (auth.uid()::text = user_id);

-- Updated_at triggers for new tables
CREATE TRIGGER update_user_github_tokens_updated_at BEFORE UPDATE ON user_github_tokens
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arenas_updated_at BEFORE UPDATE ON arenas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arena_participants_updated_at BEFORE UPDATE ON arena_participants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arena_scores_updated_at BEFORE UPDATE ON arena_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Cleanup orphaned test results (for submissions that no longer exist)
CREATE OR REPLACE FUNCTION cleanup_orphan_test_results()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM test_results tr
  WHERE NOT EXISTS (
    SELECT 1 FROM submissions s WHERE s.id = tr.submission_id
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup orphaned arena scores (for participants that no longer exist)
CREATE OR REPLACE FUNCTION cleanup_orphan_arena_scores()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM arena_scores asc2
  WHERE NOT EXISTS (
    SELECT 1 FROM arena_participants ap WHERE ap.id = asc2.participant_id
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old terminal sessions (older than specified days)
CREATE OR REPLACE FUNCTION cleanup_old_terminal_sessions(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM terminal_sessions
  WHERE status = 'destroyed'
    AND ended_at < NOW() - (days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- NOTIFICATIONS SCHEMA
-- =============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- competition_started, competition_ended, submission_result, leaderboard_change, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- Optional link to relevant page
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their notifications" ON notifications FOR DELETE USING (auth.uid()::text = user_id);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id VARCHAR(255),
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_link VARCHAR(500) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SKILL RATING SYSTEM
-- =============================================

-- User skill ratings table
CREATE TABLE IF NOT EXISTS user_skill_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  skill_rating INTEGER DEFAULT 1000, -- Starting ELO-like rating
  peak_rating INTEGER DEFAULT 1000,
  competitions_completed INTEGER DEFAULT 0,
  total_score_earned INTEGER DEFAULT 0,
  average_percentile DECIMAL(5,2) DEFAULT 50.00,
  win_count INTEGER DEFAULT 0, -- First place finishes
  top3_count INTEGER DEFAULT 0,
  top10_count INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  skill_tier VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum, diamond, master, grandmaster
  last_competition_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill rating history for tracking progress
CREATE TABLE IF NOT EXISTS skill_rating_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL,
  old_rating INTEGER NOT NULL,
  new_rating INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  rank_achieved INTEGER,
  percentile DECIMAL(5,2),
  participants_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge difficulty and verification
CREATE TABLE IF NOT EXISTS challenge_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL UNIQUE REFERENCES competitions(id) ON DELETE CASCADE,
  -- Difficulty metrics (computed)
  difficulty_rating INTEGER DEFAULT 50, -- 1-100 scale
  estimated_difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard, expert
  pass_rate DECIMAL(5,2), -- Percentage of successful submissions
  avg_completion_time INTEGER, -- Average time in seconds to solve
  avg_attempts INTEGER, -- Average attempts before passing
  -- Verification status
  verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, flagged, rejected
  verified_by VARCHAR(255), -- Admin/moderator who verified
  verified_at TIMESTAMP WITH TIME ZONE,
  -- Community feedback
  quality_score DECIMAL(3,2) DEFAULT 0, -- 0-5 stars
  total_ratings INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  -- Skill requirements
  min_skill_rating INTEGER, -- Minimum skill rating to participate
  recommended_skill_tier VARCHAR(20), -- Recommended skill tier
  -- Computed flags
  is_suspicious BOOLEAN DEFAULT FALSE, -- Flagged for review
  suspicious_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge reports (for flagging rigged/easy challenges)
CREATE TABLE IF NOT EXISTS challenge_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  reporter_id VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- too_easy, too_hard, rigged, broken_tests, misleading, other
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge ratings by users
CREATE TABLE IF NOT EXISTS challenge_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  quality_rating INTEGER NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5), -- User's perceived difficulty
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, user_id)
);

-- Indexes for skill system
CREATE INDEX IF NOT EXISTS idx_user_skill_ratings_user ON user_skill_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_ratings_rating ON user_skill_ratings(skill_rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_skill_ratings_tier ON user_skill_ratings(skill_tier);
CREATE INDEX IF NOT EXISTS idx_skill_rating_history_user ON skill_rating_history(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_metadata_comp ON challenge_metadata(competition_id);
CREATE INDEX IF NOT EXISTS idx_challenge_metadata_status ON challenge_metadata(verification_status);
CREATE INDEX IF NOT EXISTS idx_challenge_reports_comp ON challenge_reports(competition_id);
CREATE INDEX IF NOT EXISTS idx_challenge_reports_status ON challenge_reports(status);
CREATE INDEX IF NOT EXISTS idx_challenge_ratings_comp ON challenge_ratings(competition_id);

-- RLS for skill tables
ALTER TABLE user_skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view skill ratings (public leaderboard)
CREATE POLICY "Anyone can view skill ratings" ON user_skill_ratings FOR SELECT USING (true);
CREATE POLICY "System can manage skill ratings" ON user_skill_ratings FOR ALL USING (true);

-- Users can view their own history
CREATE POLICY "Users can view skill history" ON skill_rating_history FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "System can manage skill history" ON skill_rating_history FOR ALL USING (true);

-- Anyone can view challenge metadata
CREATE POLICY "Anyone can view challenge metadata" ON challenge_metadata FOR SELECT USING (true);
CREATE POLICY "Creators can manage challenge metadata" ON challenge_metadata FOR ALL USING (
  EXISTS (SELECT 1 FROM competitions WHERE id = challenge_metadata.competition_id AND creator_id = auth.uid()::text)
);

-- Users can create reports
CREATE POLICY "Users can view their reports" ON challenge_reports FOR SELECT USING (auth.uid()::text = reporter_id);
CREATE POLICY "Users can create reports" ON challenge_reports FOR INSERT WITH CHECK (auth.uid()::text = reporter_id);

-- Users can rate challenges they've participated in
CREATE POLICY "Users can view ratings" ON challenge_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate challenges" ON challenge_ratings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their ratings" ON challenge_ratings FOR UPDATE USING (auth.uid()::text = user_id);

-- Triggers
CREATE TRIGGER update_user_skill_ratings_updated_at BEFORE UPDATE ON user_skill_ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_metadata_updated_at BEFORE UPDATE ON challenge_metadata
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SKILL RATING FUNCTIONS
-- =============================================

-- Calculate skill tier based on rating
CREATE OR REPLACE FUNCTION get_skill_tier(rating INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF rating >= 2400 THEN RETURN 'grandmaster';
  ELSIF rating >= 2200 THEN RETURN 'master';
  ELSIF rating >= 2000 THEN RETURN 'diamond';
  ELSIF rating >= 1800 THEN RETURN 'platinum';
  ELSIF rating >= 1600 THEN RETURN 'gold';
  ELSIF rating >= 1400 THEN RETURN 'silver';
  ELSE RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update user skill rating after competition ends
CREATE OR REPLACE FUNCTION update_skill_rating(
  p_user_id VARCHAR(255),
  p_competition_id UUID,
  p_rank INTEGER,
  p_total_participants INTEGER,
  p_score INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_current_rating INTEGER;
  v_percentile DECIMAL(5,2);
  v_rating_change INTEGER;
  v_new_rating INTEGER;
  v_k_factor INTEGER := 32; -- ELO K-factor
BEGIN
  -- Get or create skill rating record
  INSERT INTO user_skill_ratings (user_id, skill_rating)
  VALUES (p_user_id, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT skill_rating INTO v_current_rating
  FROM user_skill_ratings WHERE user_id = p_user_id;

  -- Calculate percentile (100 = best, 0 = worst)
  v_percentile := ((p_total_participants - p_rank)::DECIMAL / p_total_participants) * 100;

  -- Calculate rating change based on performance vs expected
  -- Expected performance based on current rating
  -- Higher rated players are expected to do better
  v_rating_change := ROUND(v_k_factor * (v_percentile / 100 - 0.5));
  
  -- Bonus for winning or top 3
  IF p_rank = 1 THEN
    v_rating_change := v_rating_change + 15;
  ELSIF p_rank <= 3 THEN
    v_rating_change := v_rating_change + 8;
  ELSIF p_rank <= 10 THEN
    v_rating_change := v_rating_change + 3;
  END IF;

  -- Penalty reduction for new players (first 10 competitions)
  IF (SELECT competitions_completed FROM user_skill_ratings WHERE user_id = p_user_id) < 10 THEN
    IF v_rating_change < 0 THEN
      v_rating_change := v_rating_change / 2;
    END IF;
  END IF;

  v_new_rating := GREATEST(100, v_current_rating + v_rating_change); -- Minimum rating of 100

  -- Record history
  INSERT INTO skill_rating_history (
    user_id, competition_id, old_rating, new_rating, rating_change,
    rank_achieved, percentile, participants_count
  ) VALUES (
    p_user_id, p_competition_id, v_current_rating, v_new_rating, v_rating_change,
    p_rank, v_percentile, p_total_participants
  );

  -- Update user skill rating
  UPDATE user_skill_ratings
  SET
    skill_rating = v_new_rating,
    peak_rating = GREATEST(peak_rating, v_new_rating),
    competitions_completed = competitions_completed + 1,
    total_score_earned = total_score_earned + p_score,
    average_percentile = (average_percentile * competitions_completed + v_percentile) / (competitions_completed + 1),
    win_count = win_count + CASE WHEN p_rank = 1 THEN 1 ELSE 0 END,
    top3_count = top3_count + CASE WHEN p_rank <= 3 THEN 1 ELSE 0 END,
    top10_count = top10_count + CASE WHEN p_rank <= 10 THEN 1 ELSE 0 END,
    skill_tier = get_skill_tier(v_new_rating),
    last_competition_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_new_rating;
END;
$$ LANGUAGE plpgsql;

-- Update challenge difficulty metrics
CREATE OR REPLACE FUNCTION update_challenge_metrics(p_competition_id UUID)
RETURNS VOID AS $$
DECLARE
  v_pass_rate DECIMAL(5,2);
  v_avg_time INTEGER;
  v_avg_attempts INTEGER;
  v_total_submissions INTEGER;
  v_passed_submissions INTEGER;
  v_difficulty_rating INTEGER;
  v_difficulty_label VARCHAR(20);
BEGIN
  -- Calculate metrics from submissions
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'passed'),
    AVG(execution_time) FILTER (WHERE status = 'passed'),
    AVG(attempt_count)
  INTO v_total_submissions, v_passed_submissions, v_avg_time, v_avg_attempts
  FROM (
    SELECT 
      status, 
      execution_time,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY submitted_at) as attempt_count
    FROM submissions
    WHERE competition_id = p_competition_id
  ) sub;

  -- Calculate pass rate
  IF v_total_submissions > 0 THEN
    v_pass_rate := (v_passed_submissions::DECIMAL / v_total_submissions) * 100;
  ELSE
    v_pass_rate := NULL;
  END IF;

  -- Calculate difficulty rating (0-100, higher = harder)
  -- Based on pass rate, time, and attempts
  IF v_pass_rate IS NOT NULL THEN
    v_difficulty_rating := 100 - v_pass_rate::INTEGER;
    
    -- Adjust based on average attempts
    IF v_avg_attempts > 5 THEN
      v_difficulty_rating := v_difficulty_rating + 10;
    ELSIF v_avg_attempts < 2 THEN
      v_difficulty_rating := v_difficulty_rating - 10;
    END IF;

    v_difficulty_rating := GREATEST(0, LEAST(100, v_difficulty_rating));

    -- Determine difficulty label
    IF v_difficulty_rating >= 80 THEN v_difficulty_label := 'expert';
    ELSIF v_difficulty_rating >= 60 THEN v_difficulty_label := 'hard';
    ELSIF v_difficulty_rating >= 40 THEN v_difficulty_label := 'medium';
    ELSE v_difficulty_label := 'easy';
    END IF;
  ELSE
    v_difficulty_rating := 50;
    v_difficulty_label := 'medium';
  END IF;

  -- Upsert challenge metadata
  INSERT INTO challenge_metadata (
    competition_id, difficulty_rating, estimated_difficulty, pass_rate,
    avg_completion_time, avg_attempts
  ) VALUES (
    p_competition_id, v_difficulty_rating, v_difficulty_label, v_pass_rate,
    v_avg_time, v_avg_attempts
  )
  ON CONFLICT (competition_id) DO UPDATE SET
    difficulty_rating = EXCLUDED.difficulty_rating,
    estimated_difficulty = EXCLUDED.estimated_difficulty,
    pass_rate = EXCLUDED.pass_rate,
    avg_completion_time = EXCLUDED.avg_completion_time,
    avg_attempts = EXCLUDED.avg_attempts,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Increment report count helper
CREATE OR REPLACE FUNCTION increment_report_count(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO challenge_metadata (competition_id, report_count)
  VALUES (p_competition_id, 1)
  ON CONFLICT (competition_id) DO UPDATE
  SET report_count = challenge_metadata.report_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Check for suspicious challenges
CREATE OR REPLACE FUNCTION check_challenge_suspicious(p_competition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_metadata challenge_metadata%ROWTYPE;
  v_is_suspicious BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  SELECT * INTO v_metadata
  FROM challenge_metadata
  WHERE competition_id = p_competition_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check for suspiciously high pass rate with high quality ratings
  IF v_metadata.pass_rate > 95 AND v_metadata.total_ratings > 5 AND v_metadata.quality_score < 3 THEN
    v_is_suspicious := TRUE;
    v_reason := v_reason || 'Very high pass rate with low quality ratings. ';
  END IF;

  -- Check for many reports
  IF v_metadata.report_count >= 3 THEN
    v_is_suspicious := TRUE;
    v_reason := v_reason || 'Multiple user reports. ';
  END IF;

  -- Check for instant completions (potential answer leak)
  IF v_metadata.avg_completion_time IS NOT NULL AND v_metadata.avg_completion_time < 30 THEN
    v_is_suspicious := TRUE;
    v_reason := v_reason || 'Suspiciously fast average completion time. ';
  END IF;

  -- Update metadata
  UPDATE challenge_metadata
  SET 
    is_suspicious = v_is_suspicious,
    suspicious_reason = NULLIF(TRIM(v_reason), '')
  WHERE competition_id = p_competition_id;

  RETURN v_is_suspicious;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ADDITIONAL CLEANUP FUNCTIONS
-- =============================================

-- Cleanup stale draft competitions (no activity for 30+ days)
CREATE OR REPLACE FUNCTION cleanup_stale_drafts(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM competitions
  WHERE status = 'draft'
    AND updated_at < NOW() - (days_old || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM test_cases WHERE competition_id = competitions.id
    );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old failed submissions (keep only recent failures)
CREATE OR REPLACE FUNCTION cleanup_old_failed_submissions(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old failed submissions, keeping at least the 5 most recent per user per competition
  WITH ranked_failures AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, competition_id 
      ORDER BY submitted_at DESC
    ) as rn
    FROM submissions
    WHERE status = 'failed'
      AND submitted_at < NOW() - (days_old || ' days')::INTERVAL
  )
  DELETE FROM submissions
  WHERE id IN (
    SELECT id FROM ranked_failures WHERE rn > 5
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired GitHub tokens
CREATE OR REPLACE FUNCTION cleanup_expired_github_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_github_tokens
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old skill rating history (keep last 100 per user)
CREATE OR REPLACE FUNCTION cleanup_old_skill_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH ranked_history AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY created_at DESC
    ) as rn
    FROM skill_rating_history
  )
  DELETE FROM skill_rating_history
  WHERE id IN (
    SELECT id FROM ranked_history WHERE rn > 100
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup resolved challenge reports older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_challenge_reports(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM challenge_reports
  WHERE status IN ('resolved', 'dismissed')
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master cleanup function that runs all cleanups
CREATE OR REPLACE FUNCTION run_all_cleanups()
RETURNS TABLE (
  cleanup_name TEXT,
  items_cleaned INTEGER
) AS $$
BEGIN
  cleanup_name := 'orphan_test_results';
  items_cleaned := cleanup_orphan_test_results();
  RETURN NEXT;

  cleanup_name := 'orphan_arena_scores';
  items_cleaned := cleanup_orphan_arena_scores();
  RETURN NEXT;

  cleanup_name := 'old_terminal_sessions';
  items_cleaned := cleanup_old_terminal_sessions(7);
  RETURN NEXT;

  cleanup_name := 'old_notifications';
  items_cleaned := cleanup_old_notifications(30);
  RETURN NEXT;

  cleanup_name := 'stale_drafts';
  items_cleaned := cleanup_stale_drafts(30);
  RETURN NEXT;

  cleanup_name := 'old_failed_submissions';
  items_cleaned := cleanup_old_failed_submissions(90);
  RETURN NEXT;

  cleanup_name := 'expired_github_tokens';
  items_cleaned := cleanup_expired_github_tokens();
  RETURN NEXT;

  cleanup_name := 'old_skill_history';
  items_cleaned := cleanup_old_skill_history();
  RETURN NEXT;

  cleanup_name := 'old_challenge_reports';
  items_cleaned := cleanup_old_challenge_reports(90);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global skill leaderboard view
CREATE OR REPLACE VIEW skill_leaderboard AS
SELECT 
  usr.user_id,
  usr.skill_rating,
  usr.skill_tier,
  usr.peak_rating,
  usr.competitions_completed,
  usr.win_count,
  usr.top3_count,
  usr.average_percentile,
  usr.current_streak,
  usr.last_competition_at,
  RANK() OVER (ORDER BY usr.skill_rating DESC) as global_rank
FROM user_skill_ratings usr
WHERE usr.competitions_completed >= 3 -- Minimum 3 competitions to appear
ORDER BY usr.skill_rating DESC;

-- =============================================
-- 1v1 DUEL SYSTEM
-- =============================================

-- Duel challenge pool (pre-made challenges for duels)
CREATE TABLE IF NOT EXISTS duel_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL, -- easy, medium, hard, expert
  category VARCHAR(50), -- arrays, strings, dp, trees, etc.
  time_limit_seconds INTEGER DEFAULT 300, -- 5 minutes default
  test_cases JSONB NOT NULL, -- Array of {input, expected_output, points}
  starter_code JSONB, -- Optional starter code per language
  solution_code JSONB, -- Reference solution per language (for bot)
  times_used INTEGER DEFAULT 0,
  avg_solve_time INTEGER, -- Average solve time in seconds
  pass_rate DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS duel_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE, -- One entry per user
  username VARCHAR(255) NOT NULL,
  skill_rating INTEGER DEFAULT 1000,
  selected_language VARCHAR(50) NOT NULL,
  difficulty_preference VARCHAR(20), -- null = any, or specific difficulty
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 minutes'
);

-- Duel matches
CREATE TABLE IF NOT EXISTS duels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES duel_challenges(id),
  player1_id VARCHAR(255) NOT NULL,
  player1_username VARCHAR(255) NOT NULL,
  player1_rating INTEGER NOT NULL,
  player2_id VARCHAR(255), -- NULL if vs bot
  player2_username VARCHAR(255), -- 'CodeBot' for bots
  player2_rating INTEGER,
  player2_is_bot BOOLEAN DEFAULT FALSE,
  language VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, completed, cancelled
  winner_id VARCHAR(255),
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_time INTEGER, -- Solve time in seconds
  player2_time INTEGER,
  player1_submitted_at TIMESTAMP WITH TIME ZONE,
  player2_submitted_at TIMESTAMP WITH TIME ZONE,
  rating_change_p1 INTEGER, -- ELO change for player 1
  rating_change_p2 INTEGER, -- ELO change for player 2
  challenge_type VARCHAR(20) DEFAULT 'random', -- random, direct_challenge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Duel submissions (code submitted during duel)
CREATE TABLE IF NOT EXISTS duel_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, running, passed, failed
  score INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_total INTEGER DEFAULT 0,
  execution_time INTEGER, -- in milliseconds
  error_message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Direct challenges (challenge specific user)
CREATE TABLE IF NOT EXISTS duel_challenges_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id VARCHAR(255) NOT NULL,
  challenger_username VARCHAR(255) NOT NULL,
  challenged_id VARCHAR(255) NOT NULL,
  challenged_username VARCHAR(255) NOT NULL,
  language VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, expired
  duel_id UUID REFERENCES duels(id), -- Set when accepted and duel created
  message TEXT, -- Optional message from challenger
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for duel system
CREATE INDEX IF NOT EXISTS idx_duel_queue_rating ON duel_queue(skill_rating);
CREATE INDEX IF NOT EXISTS idx_duel_queue_language ON duel_queue(selected_language);
CREATE INDEX IF NOT EXISTS idx_duel_queue_expires ON duel_queue(expires_at);
CREATE INDEX IF NOT EXISTS idx_duels_player1 ON duels(player1_id);
CREATE INDEX IF NOT EXISTS idx_duels_player2 ON duels(player2_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);
CREATE INDEX IF NOT EXISTS idx_duel_submissions_duel ON duel_submissions(duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_challenges_sent_challenged ON duel_challenges_sent(challenged_id, status);
CREATE INDEX IF NOT EXISTS idx_duel_challenges_difficulty ON duel_challenges(difficulty, is_active);

-- RLS for duel tables
ALTER TABLE duel_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_challenges_sent ENABLE ROW LEVEL SECURITY;

-- Challenges are public
CREATE POLICY "Anyone can view duel challenges" ON duel_challenges FOR SELECT USING (true);
CREATE POLICY "Admins can manage duel challenges" ON duel_challenges FOR ALL USING (true);

-- Queue policies
CREATE POLICY "Users can view queue" ON duel_queue FOR SELECT USING (true);
CREATE POLICY "Users can manage own queue entry" ON duel_queue FOR ALL USING (auth.uid()::text = user_id);

-- Duel policies
CREATE POLICY "Users can view duels they're in" ON duels FOR SELECT 
  USING (player1_id = auth.uid()::text OR player2_id = auth.uid()::text OR player2_is_bot = true);
CREATE POLICY "System can manage duels" ON duels FOR ALL USING (true);

-- Submission policies  
CREATE POLICY "Users can view their duel submissions" ON duel_submissions FOR SELECT
  USING (user_id = auth.uid()::text);
CREATE POLICY "Users can create duel submissions" ON duel_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- Challenge sent policies
CREATE POLICY "Users can view their challenges" ON duel_challenges_sent FOR SELECT
  USING (challenger_id = auth.uid()::text OR challenged_id = auth.uid()::text);
CREATE POLICY "Users can send challenges" ON duel_challenges_sent FOR INSERT
  WITH CHECK (challenger_id = auth.uid()::text);
CREATE POLICY "Challenged users can respond" ON duel_challenges_sent FOR UPDATE
  USING (challenged_id = auth.uid()::text);

-- =============================================
-- DUEL SYSTEM FUNCTIONS
-- =============================================

-- Find a match in the queue (within rating range)
CREATE OR REPLACE FUNCTION find_duel_match(
  p_user_id VARCHAR(255),
  p_language VARCHAR(50),
  p_rating INTEGER,
  p_rating_range INTEGER DEFAULT 200
)
RETURNS TABLE (
  matched_user_id VARCHAR(255),
  matched_username VARCHAR(255),
  matched_rating INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dq.user_id,
    dq.username,
    dq.skill_rating
  FROM duel_queue dq
  WHERE dq.user_id != p_user_id
    AND dq.selected_language = p_language
    AND dq.skill_rating BETWEEN (p_rating - p_rating_range) AND (p_rating + p_rating_range)
    AND dq.expires_at > NOW()
  ORDER BY ABS(dq.skill_rating - p_rating) ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Calculate ELO change for duel
CREATE OR REPLACE FUNCTION calculate_duel_elo(
  p_winner_rating INTEGER,
  p_loser_rating INTEGER,
  p_is_draw BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  winner_change INTEGER,
  loser_change INTEGER
) AS $$
DECLARE
  v_k_factor INTEGER := 32;
  v_expected_winner DECIMAL;
  v_expected_loser DECIMAL;
  v_winner_change INTEGER;
  v_loser_change INTEGER;
BEGIN
  -- Calculate expected scores
  v_expected_winner := 1.0 / (1.0 + POWER(10, (p_loser_rating - p_winner_rating)::DECIMAL / 400));
  v_expected_loser := 1.0 - v_expected_winner;
  
  IF p_is_draw THEN
    -- Draw: both get/lose based on expectation
    v_winner_change := ROUND(v_k_factor * (0.5 - v_expected_winner));
    v_loser_change := ROUND(v_k_factor * (0.5 - v_expected_loser));
  ELSE
    -- Win/Loss
    v_winner_change := ROUND(v_k_factor * (1.0 - v_expected_winner));
    v_loser_change := ROUND(v_k_factor * (0.0 - v_expected_loser));
  END IF;
  
  RETURN QUERY SELECT v_winner_change, v_loser_change;
END;
$$ LANGUAGE plpgsql;

-- Get random challenge for duel
CREATE OR REPLACE FUNCTION get_random_duel_challenge(
  p_difficulty VARCHAR(20) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_challenge_id UUID;
BEGIN
  SELECT id INTO v_challenge_id
  FROM duel_challenges
  WHERE is_active = TRUE
    AND (p_difficulty IS NULL OR difficulty = p_difficulty)
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Increment usage counter
  IF v_challenge_id IS NOT NULL THEN
    UPDATE duel_challenges 
    SET times_used = times_used + 1 
    WHERE id = v_challenge_id;
  END IF;
  
  RETURN v_challenge_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired queue entries and stale duels
CREATE OR REPLACE FUNCTION cleanup_duel_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove expired queue entries
  DELETE FROM duel_queue WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Cancel duels that have been waiting too long (5 minutes)
  UPDATE duels 
  SET status = 'cancelled'
  WHERE status = 'waiting' 
    AND created_at < NOW() - INTERVAL '5 minutes';
    
  -- Cancel active duels that exceeded time limit significantly (15 minutes past)
  UPDATE duels
  SET status = 'cancelled'
  WHERE status = 'active'
    AND started_at < NOW() - INTERVAL '20 minutes';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some starter duel challenges
INSERT INTO duel_challenges (title, description, difficulty, category, time_limit_seconds, test_cases) VALUES
('Two Sum', 'Given an array of integers and a target sum, return indices of two numbers that add up to the target.', 'easy', 'arrays', 300, 
 '[{"input": "[2, 7, 11, 15]\n9", "expected_output": "[0, 1]", "points": 25}, {"input": "[3, 2, 4]\n6", "expected_output": "[1, 2]", "points": 25}, {"input": "[3, 3]\n6", "expected_output": "[0, 1]", "points": 25}, {"input": "[1, 5, 3, 7, 8, 2]\n10", "expected_output": "[1, 4]", "points": 25}]'),

('Reverse String', 'Write a function that reverses a string. The input is given as a string.', 'easy', 'strings', 180,
 '[{"input": "hello", "expected_output": "olleh", "points": 25}, {"input": "world", "expected_output": "dlrow", "points": 25}, {"input": "a", "expected_output": "a", "points": 25}, {"input": "ab", "expected_output": "ba", "points": 25}]'),

('FizzBuzz', 'Print numbers 1 to N. For multiples of 3 print Fizz, for 5 print Buzz, for both print FizzBuzz.', 'easy', 'basics', 180,
 '[{"input": "5", "expected_output": "1\n2\nFizz\n4\nBuzz", "points": 25}, {"input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", "points": 25}, {"input": "3", "expected_output": "1\n2\nFizz", "points": 25}, {"input": "1", "expected_output": "1", "points": 25}]'),

('Valid Parentheses', 'Given a string containing just parentheses, determine if the input string is valid.', 'medium', 'strings', 300,
 '[{"input": "()", "expected_output": "true", "points": 25}, {"input": "()[]{}", "expected_output": "true", "points": 25}, {"input": "(]", "expected_output": "false", "points": 25}, {"input": "([)]", "expected_output": "false", "points": 25}]'),

('Maximum Subarray', 'Find the contiguous subarray with the largest sum and return that sum.', 'medium', 'arrays', 300,
 '[{"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expected_output": "6", "points": 25}, {"input": "[1]", "expected_output": "1", "points": 25}, {"input": "[5,4,-1,7,8]", "expected_output": "23", "points": 25}, {"input": "[-1,-2,-3]", "expected_output": "-1", "points": 25}]'),

('Longest Common Prefix', 'Find the longest common prefix string amongst an array of strings.', 'medium', 'strings', 300,
 '[{"input": "[\"flower\",\"flow\",\"flight\"]", "expected_output": "fl", "points": 25}, {"input": "[\"dog\",\"racecar\",\"car\"]", "expected_output": "", "points": 25}, {"input": "[\"interspecies\",\"interstellar\",\"interstate\"]", "expected_output": "inters", "points": 25}, {"input": "[\"a\"]", "expected_output": "a", "points": 25}]'),

('Merge Intervals', 'Given an array of intervals, merge all overlapping intervals.', 'hard', 'arrays', 420,
 '[{"input": "[[1,3],[2,6],[8,10],[15,18]]", "expected_output": "[[1,6],[8,10],[15,18]]", "points": 25}, {"input": "[[1,4],[4,5]]", "expected_output": "[[1,5]]", "points": 25}, {"input": "[[1,4],[0,4]]", "expected_output": "[[0,4]]", "points": 25}, {"input": "[[1,4],[2,3]]", "expected_output": "[[1,4]]", "points": 25}]'),

('LRU Cache', 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.', 'hard', 'design', 600,
 '[{"input": "put(1,1)\nput(2,2)\nget(1)\nput(3,3)\nget(2)\nput(4,4)\nget(1)\nget(3)\nget(4)", "expected_output": "1\n-1\n-1\n1\n3\n4", "points": 34}, {"input": "put(1,1)\nget(1)\nput(2,2)\nget(2)", "expected_output": "1\n2", "points": 33}, {"input": "get(1)", "expected_output": "-1", "points": 33}]')

ON CONFLICT DO NOTHING;

-- =============================================
-- DAILY CHALLENGES & STREAKS
-- =============================================

-- Daily challenges table (auto-generated from duel_challenges pool)
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  category VARCHAR(100),
  time_limit_minutes INTEGER DEFAULT 30,
  test_cases JSONB NOT NULL, -- [{input, expected_output, points}]
  starter_code JSONB DEFAULT '{}', -- {language: code}
  allowed_languages TEXT[] DEFAULT ARRAY['python', 'javascript', 'java', 'cpp', 'go'],
  xp_reward INTEGER DEFAULT 100,
  streak_bonus_multiplier DECIMAL(3,2) DEFAULT 1.5,
  source_challenge_id UUID REFERENCES duel_challenges(id), -- Which duel challenge this was generated from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily challenge submissions
CREATE TABLE IF NOT EXISTS daily_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,
  score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  execution_time INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_challenge_id, user_id) -- One submission per user per daily
);

-- User streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  total_daily_completed INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_submissions_user ON daily_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_submissions_challenge ON daily_submissions(daily_challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);

-- =============================================
-- ORGANIZATIONS & TEAMS
-- =============================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  owner_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'team' CHECK (type IN ('team', 'school', 'company', 'community')),
  is_public BOOLEAN DEFAULT TRUE,
  invite_code VARCHAR(20) UNIQUE,
  max_members INTEGER DEFAULT 50,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Organization stats (aggregated)
CREATE TABLE IF NOT EXISTS organization_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  total_members INTEGER DEFAULT 0,
  avg_skill_rating INTEGER DEFAULT 1000,
  total_competitions_won INTEGER DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization competitions (team events)
CREATE TABLE IF NOT EXISTS organization_competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  is_team_event BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, competition_id)
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- =============================================
-- LIVE SPECTATING
-- =============================================

-- Spectatable sessions
CREATE TABLE IF NOT EXISTS spectate_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  arena_id UUID,
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('duel', 'competition', 'arena')),
  is_live BOOLEAN DEFAULT TRUE,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT one_source CHECK (
    (duel_id IS NOT NULL AND competition_id IS NULL AND arena_id IS NULL) OR
    (duel_id IS NULL AND competition_id IS NOT NULL AND arena_id IS NULL) OR
    (duel_id IS NULL AND competition_id IS NULL AND arena_id IS NOT NULL)
  )
);

-- Spectators
CREATE TABLE IF NOT EXISTS spectators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES spectate_sessions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, user_id)
);

-- Emote reactions
CREATE TABLE IF NOT EXISTS spectate_emotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES spectate_sessions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  emote VARCHAR(50) NOT NULL, -- 'clap', 'fire', 'wow', 'gg', 'thinking', 'sad'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages in spectate
CREATE TABLE IF NOT EXISTS spectate_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES spectate_sessions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  message TEXT NOT NULL,
  is_highlight BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spectate_sessions_duel ON spectate_sessions(duel_id);
CREATE INDEX IF NOT EXISTS idx_spectate_sessions_live ON spectate_sessions(is_live);
CREATE INDEX IF NOT EXISTS idx_spectators_session ON spectators(session_id);
CREATE INDEX IF NOT EXISTS idx_spectate_emotes_session ON spectate_emotes(session_id);
CREATE INDEX IF NOT EXISTS idx_spectate_chat_session ON spectate_chat(session_id);

-- =============================================
-- ACHIEVEMENTS SYSTEM
-- =============================================

-- Achievement definitions
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('competition', 'duel', 'streak', 'skill', 'social', 'special')),
  icon VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER DEFAULT 50,
  requirement_type VARCHAR(50) NOT NULL, -- 'count', 'streak', 'rating', 'speed', 'special'
  requirement_value INTEGER,
  requirement_data JSONB DEFAULT '{}',
  is_secret BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked);

-- RLS Policies for new tables
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectate_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectators ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectate_emotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectate_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Daily challenges: read all, submit own
CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT USING (true);
CREATE POLICY "Users can view all daily submissions" ON daily_submissions FOR SELECT USING (true);
CREATE POLICY "Users can submit their own" ON daily_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their streaks" ON user_streaks FOR SELECT USING (true);
CREATE POLICY "System can manage streaks" ON user_streaks FOR ALL USING (true);

-- Organizations: public visible, members can see private
CREATE POLICY "Anyone can view public orgs" ON organizations FOR SELECT USING (is_public = true);
CREATE POLICY "Members can view their orgs" ON organization_members FOR SELECT USING (true);
CREATE POLICY "Admins can manage members" ON organization_members FOR ALL USING (true);
CREATE POLICY "Anyone can view org stats" ON organization_stats FOR SELECT USING (true);

-- Spectating: all visible
CREATE POLICY "Anyone can view live sessions" ON spectate_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can view spectators" ON spectators FOR SELECT USING (true);
CREATE POLICY "Users can join as spectator" ON spectators FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can send emotes" ON spectate_emotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view emotes" ON spectate_emotes FOR SELECT USING (true);
CREATE POLICY "Anyone can chat" ON spectate_chat FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view chat" ON spectate_chat FOR SELECT USING (true);

-- Achievements: all visible
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Users can view their achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "System can manage user achievements" ON user_achievements FOR ALL USING (true);

-- =============================================
-- SEED ACHIEVEMENTS
-- =============================================

INSERT INTO achievements (slug, name, description, category, icon, rarity, xp_reward, requirement_type, requirement_value) VALUES
-- Competition achievements
('first_submission', 'First Steps', 'Submit your first solution', 'competition', '🎯', 'common', 25, 'count', 1),
('ten_submissions', 'Getting Warmed Up', 'Submit 10 solutions', 'competition', '🔥', 'common', 50, 'count', 10),
('hundred_submissions', 'Centurion', 'Submit 100 solutions', 'competition', '💯', 'rare', 200, 'count', 100),
('first_win', 'Victor', 'Win your first competition', 'competition', '🏆', 'uncommon', 100, 'count', 1),
('five_wins', 'Champion', 'Win 5 competitions', 'competition', '👑', 'rare', 300, 'count', 5),
('perfect_score', 'Perfectionist', 'Get 100% score on a competition', 'competition', '⭐', 'uncommon', 150, 'special', 100),

-- Duel achievements
('first_duel', 'Challenger', 'Complete your first duel', 'duel', '⚔️', 'common', 25, 'count', 1),
('duel_winner', 'Duelist', 'Win your first duel', 'duel', '🎖️', 'common', 50, 'count', 1),
('ten_duel_wins', 'Gladiator', 'Win 10 duels', 'duel', '🗡️', 'uncommon', 150, 'count', 10),
('fifty_duel_wins', 'Arena Master', 'Win 50 duels', 'duel', '⚡', 'rare', 400, 'count', 50),
('duel_streak_5', 'Hot Streak', 'Win 5 duels in a row', 'duel', '🔥', 'rare', 250, 'streak', 5),
('duel_streak_10', 'Unstoppable', 'Win 10 duels in a row', 'duel', '💪', 'epic', 500, 'streak', 10),
('speed_demon', 'Speed Demon', 'Win a duel in under 60 seconds', 'duel', '⚡', 'rare', 300, 'speed', 60),

-- Streak achievements
('streak_3', 'Consistent', 'Complete 3 daily challenges in a row', 'streak', '📅', 'common', 50, 'streak', 3),
('streak_7', 'Week Warrior', 'Complete 7 daily challenges in a row', 'streak', '🗓️', 'uncommon', 150, 'streak', 7),
('streak_30', 'Month Master', 'Complete 30 daily challenges in a row', 'streak', '📆', 'rare', 500, 'streak', 30),
('streak_100', 'Century Streak', 'Complete 100 daily challenges in a row', 'streak', '🏅', 'legendary', 2000, 'streak', 100),
('daily_solver', 'Daily Devotee', 'Complete 50 total daily challenges', 'streak', '⭐', 'uncommon', 200, 'count', 50),

-- Skill achievements
('rating_1200', 'Rising Star', 'Reach 1200 skill rating', 'skill', '⬆️', 'common', 75, 'rating', 1200),
('rating_1500', 'Skilled Coder', 'Reach 1500 skill rating', 'skill', '📈', 'uncommon', 150, 'rating', 1500),
('rating_1800', 'Expert', 'Reach 1800 skill rating', 'skill', '🌟', 'rare', 300, 'rating', 1800),
('rating_2000', 'Master', 'Reach 2000 skill rating', 'skill', '💎', 'epic', 500, 'rating', 2000),
('rating_2200', 'Grandmaster', 'Reach 2200 skill rating', 'skill', '👑', 'legendary', 1000, 'rating', 2200),

-- Social achievements
('join_org', 'Team Player', 'Join an organization', 'social', '🤝', 'common', 25, 'count', 1),
('create_org', 'Leader', 'Create an organization', 'social', '🏛️', 'uncommon', 100, 'count', 1),
('challenge_friend', 'Friendly Fire', 'Challenge a friend to a duel', 'social', '👊', 'common', 30, 'count', 1),
('spectate_match', 'Spectator', 'Watch a live duel', 'social', '👀', 'common', 20, 'count', 1),
('send_emote', 'Cheerleader', 'Send 10 emotes while spectating', 'social', '🎉', 'common', 25, 'count', 10),

-- Special achievements
('night_owl', 'Night Owl', 'Submit a solution between midnight and 4am', 'special', '🦉', 'uncommon', 75, 'special', 0),
('early_bird', 'Early Bird', 'Submit a solution between 5am and 7am', 'special', '🐦', 'uncommon', 75, 'special', 0),
('polyglot', 'Polyglot', 'Submit solutions in 5 different languages', 'special', '🌐', 'rare', 200, 'count', 5),
('comeback_kid', 'Comeback Kid', 'Win after being behind', 'special', '🔄', 'rare', 250, 'special', 0),
('speed_solver', 'Lightning Fast', 'Solve 10 problems in under 2 minutes each', 'special', '⚡', 'epic', 400, 'count', 10)

ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- MORE DUEL CHALLENGES (Per Language/Difficulty)
-- =============================================

-- Easy challenges
INSERT INTO duel_challenges (title, description, difficulty, category, time_limit_seconds, test_cases) VALUES
('Sum of Array', 'Calculate the sum of all elements in an integer array.', 'easy', 'arrays', 180,
 '[{"input": "[1, 2, 3, 4, 5]", "expected_output": "15", "points": 25}, {"input": "[10, -5, 3]", "expected_output": "8", "points": 25}, {"input": "[]", "expected_output": "0", "points": 25}, {"input": "[100]", "expected_output": "100", "points": 25}]'),

('Count Vowels', 'Count the number of vowels (a,e,i,o,u) in a given string.', 'easy', 'strings', 180,
 '[{"input": "hello world", "expected_output": "3", "points": 25}, {"input": "AEIOU", "expected_output": "5", "points": 25}, {"input": "xyz", "expected_output": "0", "points": 25}, {"input": "Programming", "expected_output": "3", "points": 25}]'),

('Even or Odd', 'Print "Even" or "Odd" for each number in the array.', 'easy', 'basics', 180,
 '[{"input": "[1, 2, 3, 4]", "expected_output": "Odd\nEven\nOdd\nEven", "points": 25}, {"input": "[0]", "expected_output": "Even", "points": 25}, {"input": "[7, 14, 21]", "expected_output": "Odd\nEven\nOdd", "points": 25}, {"input": "[2, 4, 6, 8]", "expected_output": "Even\nEven\nEven\nEven", "points": 25}]'),

('Factorial', 'Calculate the factorial of a given non-negative integer.', 'easy', 'math', 180,
 '[{"input": "5", "expected_output": "120", "points": 25}, {"input": "0", "expected_output": "1", "points": 25}, {"input": "1", "expected_output": "1", "points": 25}, {"input": "10", "expected_output": "3628800", "points": 25}]'),

('Palindrome Check', 'Check if a string is a palindrome (reads same forwards and backwards).', 'easy', 'strings', 180,
 '[{"input": "racecar", "expected_output": "true", "points": 25}, {"input": "hello", "expected_output": "false", "points": 25}, {"input": "a", "expected_output": "true", "points": 25}, {"input": "abba", "expected_output": "true", "points": 25}]'),

('Find Maximum', 'Find and return the maximum value in an array.', 'easy', 'arrays', 180,
 '[{"input": "[3, 1, 4, 1, 5, 9]", "expected_output": "9", "points": 25}, {"input": "[-5, -2, -10]", "expected_output": "-2", "points": 25}, {"input": "[42]", "expected_output": "42", "points": 25}, {"input": "[1, 1, 1, 1]", "expected_output": "1", "points": 25}]'),

-- Medium challenges
('Binary Search', 'Implement binary search. Return the index of target or -1 if not found.', 'medium', 'algorithms', 300,
 '[{"input": "[1,2,3,4,5,6,7]\n4", "expected_output": "3", "points": 25}, {"input": "[1,3,5,7,9]\n6", "expected_output": "-1", "points": 25}, {"input": "[1]\n1", "expected_output": "0", "points": 25}, {"input": "[1,2,3,4,5]\n1", "expected_output": "0", "points": 25}]'),

('Anagram Check', 'Check if two strings are anagrams of each other.', 'medium', 'strings', 300,
 '[{"input": "listen\nsilent", "expected_output": "true", "points": 25}, {"input": "hello\nworld", "expected_output": "false", "points": 25}, {"input": "anagram\nnagaram", "expected_output": "true", "points": 25}, {"input": "rat\ncar", "expected_output": "false", "points": 25}]'),

('Remove Duplicates', 'Remove duplicates from sorted array in-place, return new length.', 'medium', 'arrays', 300,
 '[{"input": "[1,1,2]", "expected_output": "2", "points": 25}, {"input": "[0,0,1,1,1,2,2,3,3,4]", "expected_output": "5", "points": 25}, {"input": "[1]", "expected_output": "1", "points": 25}, {"input": "[1,2,3]", "expected_output": "3", "points": 25}]'),

('Spiral Matrix', 'Return all elements of a matrix in spiral order.', 'medium', 'arrays', 360,
 '[{"input": "[[1,2,3],[4,5,6],[7,8,9]]", "expected_output": "[1,2,3,6,9,8,7,4,5]", "points": 25}, {"input": "[[1,2],[3,4]]", "expected_output": "[1,2,4,3]", "points": 25}, {"input": "[[1]]", "expected_output": "[1]", "points": 25}, {"input": "[[1,2,3,4]]", "expected_output": "[1,2,3,4]", "points": 25}]'),

('Group Anagrams', 'Group strings that are anagrams of each other.', 'medium', 'strings', 360,
 '[{"input": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "expected_output": "[[\"eat\",\"tea\",\"ate\"],[\"tan\",\"nat\"],[\"bat\"]]", "points": 34}, {"input": "[\"\"]", "expected_output": "[[\"\"]]", "points": 33}, {"input": "[\"a\"]", "expected_output": "[[\"a\"]]", "points": 33}]'),

('Rotate Array', 'Rotate an array to the right by k steps.', 'medium', 'arrays', 300,
 '[{"input": "[1,2,3,4,5,6,7]\n3", "expected_output": "[5,6,7,1,2,3,4]", "points": 25}, {"input": "[-1,-100,3,99]\n2", "expected_output": "[3,99,-1,-100]", "points": 25}, {"input": "[1,2]\n1", "expected_output": "[2,1]", "points": 25}, {"input": "[1]\n0", "expected_output": "[1]", "points": 25}]'),

-- Hard challenges
('Longest Substring', 'Find length of longest substring without repeating characters.', 'hard', 'strings', 420,
 '[{"input": "abcabcbb", "expected_output": "3", "points": 25}, {"input": "bbbbb", "expected_output": "1", "points": 25}, {"input": "pwwkew", "expected_output": "3", "points": 25}, {"input": "", "expected_output": "0", "points": 25}]'),

('Median Two Arrays', 'Find the median of two sorted arrays.', 'hard', 'arrays', 480,
 '[{"input": "[1,3]\n[2]", "expected_output": "2.0", "points": 25}, {"input": "[1,2]\n[3,4]", "expected_output": "2.5", "points": 25}, {"input": "[0,0]\n[0,0]", "expected_output": "0.0", "points": 25}, {"input": "[]\n[1]", "expected_output": "1.0", "points": 25}]'),

('Word Break', 'Determine if string can be segmented into dictionary words.', 'hard', 'dynamic-programming', 420,
 '[{"input": "leetcode\n[\"leet\",\"code\"]", "expected_output": "true", "points": 25}, {"input": "applepenapple\n[\"apple\",\"pen\"]", "expected_output": "true", "points": 25}, {"input": "catsandog\n[\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]", "expected_output": "false", "points": 25}, {"input": "a\n[\"a\"]", "expected_output": "true", "points": 25}]'),

('N-Queens', 'Place N queens on NxN board so no two queens attack each other. Return count.', 'hard', 'backtracking', 600,
 '[{"input": "4", "expected_output": "2", "points": 25}, {"input": "1", "expected_output": "1", "points": 25}, {"input": "8", "expected_output": "92", "points": 25}, {"input": "5", "expected_output": "10", "points": 25}]'),

('Trapping Rain Water', 'Calculate how much water can be trapped after raining.', 'hard', 'arrays', 420,
 '[{"input": "[0,1,0,2,1,0,1,3,2,1,2,1]", "expected_output": "6", "points": 25}, {"input": "[4,2,0,3,2,5]", "expected_output": "9", "points": 25}, {"input": "[1,2,1]", "expected_output": "0", "points": 25}, {"input": "[3,0,0,2,0,4]", "expected_output": "10", "points": 25}]'),

('Serialize Tree', 'Serialize and deserialize a binary tree to/from string.', 'hard', 'trees', 600,
 '[{"input": "[1,2,3,null,null,4,5]", "expected_output": "[1,2,3,null,null,4,5]", "points": 34}, {"input": "[]", "expected_output": "[]", "points": 33}, {"input": "[1]", "expected_output": "[1]", "points": 33}]'),

-- =============================================
-- ADDITIONAL EASY CHALLENGES WITH EDGE CASES
-- =============================================

('Fibonacci Number', 'Return the nth Fibonacci number. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2)', 'easy', 'math', 180,
 '[{"input": "0", "expected_output": "0", "points": 20}, {"input": "1", "expected_output": "1", "points": 20}, {"input": "10", "expected_output": "55", "points": 20}, {"input": "20", "expected_output": "6765", "points": 20}, {"input": "2", "expected_output": "1", "points": 20}]'),

('Count Characters', 'Count occurrences of a character in a string (case-sensitive).', 'easy', 'strings', 180,
 '[{"input": "hello\nl", "expected_output": "2", "points": 25}, {"input": "aaaaaa\na", "expected_output": "6", "points": 25}, {"input": "test\nz", "expected_output": "0", "points": 25}, {"input": "\na", "expected_output": "0", "points": 25}]'),

('Array Average', 'Calculate the average of all numbers in an array. Return as float with 2 decimals.', 'easy', 'arrays', 180,
 '[{"input": "[1, 2, 3, 4, 5]", "expected_output": "3.00", "points": 25}, {"input": "[10]", "expected_output": "10.00", "points": 25}, {"input": "[1, 2]", "expected_output": "1.50", "points": 25}, {"input": "[-5, 5]", "expected_output": "0.00", "points": 25}]'),

('Is Prime', 'Check if a number is prime. Return "true" or "false".', 'easy', 'math', 180,
 '[{"input": "2", "expected_output": "true", "points": 20}, {"input": "1", "expected_output": "false", "points": 20}, {"input": "17", "expected_output": "true", "points": 20}, {"input": "4", "expected_output": "false", "points": 20}, {"input": "0", "expected_output": "false", "points": 20}]'),

('Reverse Array', 'Reverse an array in place and return it.', 'easy', 'arrays', 180,
 '[{"input": "[1, 2, 3, 4, 5]", "expected_output": "[5, 4, 3, 2, 1]", "points": 25}, {"input": "[]", "expected_output": "[]", "points": 25}, {"input": "[1]", "expected_output": "[1]", "points": 25}, {"input": "[1, 2]", "expected_output": "[2, 1]", "points": 25}]'),

('Sum of Digits', 'Return the sum of all digits in a positive integer.', 'easy', 'math', 180,
 '[{"input": "12345", "expected_output": "15", "points": 25}, {"input": "0", "expected_output": "0", "points": 25}, {"input": "9", "expected_output": "9", "points": 25}, {"input": "999", "expected_output": "27", "points": 25}]'),

('Title Case', 'Convert a string to title case (capitalize first letter of each word).', 'easy', 'strings', 180,
 '[{"input": "hello world", "expected_output": "Hello World", "points": 25}, {"input": "a", "expected_output": "A", "points": 25}, {"input": "HELLO", "expected_output": "Hello", "points": 25}, {"input": "the quick brown fox", "expected_output": "The Quick Brown Fox", "points": 25}]'),

('Count Words', 'Count the number of words in a string (space-separated).', 'easy', 'strings', 180,
 '[{"input": "hello world", "expected_output": "2", "points": 25}, {"input": "one", "expected_output": "1", "points": 25}, {"input": "  spaces  everywhere  ", "expected_output": "2", "points": 25}, {"input": "", "expected_output": "0", "points": 25}]'),

('Find Minimum', 'Find and return the minimum value in an array.', 'easy', 'arrays', 180,
 '[{"input": "[3, 1, 4, 1, 5, 9]", "expected_output": "1", "points": 25}, {"input": "[-5, -2, -10]", "expected_output": "-10", "points": 25}, {"input": "[42]", "expected_output": "42", "points": 25}, {"input": "[0, 0, 0]", "expected_output": "0", "points": 25}]'),

('String Length', 'Return the length of a string without using built-in length function.', 'easy', 'strings', 180,
 '[{"input": "hello", "expected_output": "5", "points": 25}, {"input": "", "expected_output": "0", "points": 25}, {"input": "a", "expected_output": "1", "points": 25}, {"input": "   ", "expected_output": "3", "points": 25}]'),

('Multiply Array', 'Return the product of all elements in an array.', 'easy', 'arrays', 180,
 '[{"input": "[1, 2, 3, 4]", "expected_output": "24", "points": 25}, {"input": "[5]", "expected_output": "5", "points": 25}, {"input": "[2, 0, 3]", "expected_output": "0", "points": 25}, {"input": "[-1, -1]", "expected_output": "1", "points": 25}]'),

('Remove Spaces', 'Remove all spaces from a string.', 'easy', 'strings', 180,
 '[{"input": "hello world", "expected_output": "helloworld", "points": 25}, {"input": "  a  b  c  ", "expected_output": "abc", "points": 25}, {"input": "nospaces", "expected_output": "nospaces", "points": 25}, {"input": "   ", "expected_output": "", "points": 25}]'),

('GCD', 'Find the Greatest Common Divisor of two positive integers.', 'easy', 'math', 180,
 '[{"input": "48\n18", "expected_output": "6", "points": 25}, {"input": "7\n3", "expected_output": "1", "points": 25}, {"input": "100\n25", "expected_output": "25", "points": 25}, {"input": "17\n17", "expected_output": "17", "points": 25}]'),

('Count Positive', 'Count how many positive numbers are in an array.', 'easy', 'arrays', 180,
 '[{"input": "[1, -2, 3, -4, 5]", "expected_output": "3", "points": 25}, {"input": "[-1, -2, -3]", "expected_output": "0", "points": 25}, {"input": "[0]", "expected_output": "0", "points": 25}, {"input": "[1, 2, 3]", "expected_output": "3", "points": 25}]'),

('String Contains', 'Check if string contains a substring. Return "true" or "false".', 'easy', 'strings', 180,
 '[{"input": "hello world\nworld", "expected_output": "true", "points": 25}, {"input": "hello\nxyz", "expected_output": "false", "points": 25}, {"input": "aaa\na", "expected_output": "true", "points": 25}, {"input": "\n", "expected_output": "true", "points": 25}]'),

-- =============================================
-- ADDITIONAL MEDIUM CHALLENGES WITH EDGE CASES  
-- =============================================

('Two Sum Sorted', 'Find two numbers in a sorted array that add to target. Return indices (1-indexed).', 'medium', 'arrays', 300,
 '[{"input": "[2,7,11,15]\n9", "expected_output": "[1,2]", "points": 25}, {"input": "[2,3,4]\n6", "expected_output": "[1,3]", "points": 25}, {"input": "[-1,0]\n-1", "expected_output": "[1,2]", "points": 25}, {"input": "[1,2,3,4,5]\n9", "expected_output": "[4,5]", "points": 25}]'),

('Merge Sorted Arrays', 'Merge two sorted arrays into one sorted array.', 'medium', 'arrays', 300,
 '[{"input": "[1,3,5]\n[2,4,6]", "expected_output": "[1,2,3,4,5,6]", "points": 25}, {"input": "[]\n[1,2,3]", "expected_output": "[1,2,3]", "points": 25}, {"input": "[1]\n[2]", "expected_output": "[1,2]", "points": 25}, {"input": "[1,1]\n[1,1]", "expected_output": "[1,1,1,1]", "points": 25}]'),

('First Non-Repeating', 'Find the first non-repeating character in a string. Return its index or -1.', 'medium', 'strings', 300,
 '[{"input": "leetcode", "expected_output": "0", "points": 25}, {"input": "loveleetcode", "expected_output": "2", "points": 25}, {"input": "aabb", "expected_output": "-1", "points": 25}, {"input": "a", "expected_output": "0", "points": 25}]'),

('Product Except Self', 'Return array where each element is product of all others except itself.', 'medium', 'arrays', 360,
 '[{"input": "[1,2,3,4]", "expected_output": "[24,12,8,6]", "points": 25}, {"input": "[-1,1,0,-3,3]", "expected_output": "[0,0,9,0,0]", "points": 25}, {"input": "[2,2]", "expected_output": "[2,2]", "points": 25}, {"input": "[1,0]", "expected_output": "[0,1]", "points": 25}]'),

('Longest Palindrome', 'Find the longest palindromic substring in a string.', 'medium', 'strings', 360,
 '[{"input": "babad", "expected_output": "bab", "points": 25}, {"input": "cbbd", "expected_output": "bb", "points": 25}, {"input": "a", "expected_output": "a", "points": 25}, {"input": "ac", "expected_output": "a", "points": 25}]'),

('3Sum', 'Find all unique triplets that sum to zero.', 'medium', 'arrays', 420,
 '[{"input": "[-1,0,1,2,-1,-4]", "expected_output": "[[-1,-1,2],[-1,0,1]]", "points": 34}, {"input": "[]", "expected_output": "[]", "points": 33}, {"input": "[0]", "expected_output": "[]", "points": 33}]'),

('String Multiply', 'Multiply two non-negative integers represented as strings.', 'medium', 'strings', 360,
 '[{"input": "2\n3", "expected_output": "6", "points": 25}, {"input": "123\n456", "expected_output": "56088", "points": 25}, {"input": "0\n999", "expected_output": "0", "points": 25}, {"input": "999\n0", "expected_output": "0", "points": 25}]'),

('Container With Most Water', 'Find two lines that form a container holding the most water.', 'medium', 'arrays', 360,
 '[{"input": "[1,8,6,2,5,4,8,3,7]", "expected_output": "49", "points": 25}, {"input": "[1,1]", "expected_output": "1", "points": 25}, {"input": "[4,3,2,1,4]", "expected_output": "16", "points": 25}, {"input": "[1,2,1]", "expected_output": "2", "points": 25}]'),

('Jump Game', 'Determine if you can reach the last index. Each element is max jump length.', 'medium', 'dynamic-programming', 300,
 '[{"input": "[2,3,1,1,4]", "expected_output": "true", "points": 25}, {"input": "[3,2,1,0,4]", "expected_output": "false", "points": 25}, {"input": "[0]", "expected_output": "true", "points": 25}, {"input": "[2,0,0]", "expected_output": "true", "points": 25}]'),

('Find Peak', 'Find a peak element (greater than neighbors). Return its index.', 'medium', 'arrays', 300,
 '[{"input": "[1,2,3,1]", "expected_output": "2", "points": 25}, {"input": "[1,2,1,3,5,6,4]", "expected_output": "5", "points": 25}, {"input": "[1]", "expected_output": "0", "points": 25}, {"input": "[1,2]", "expected_output": "1", "points": 25}]'),

('Pow(x,n)', 'Implement pow(x, n) which calculates x raised to the power n.', 'medium', 'math', 300,
 '[{"input": "2.0\n10", "expected_output": "1024.0", "points": 25}, {"input": "2.1\n3", "expected_output": "9.261", "points": 25}, {"input": "2.0\n-2", "expected_output": "0.25", "points": 25}, {"input": "1.0\n100", "expected_output": "1.0", "points": 25}]'),

('Search Rotated Array', 'Search for target in a rotated sorted array. Return index or -1.', 'medium', 'arrays', 360,
 '[{"input": "[4,5,6,7,0,1,2]\n0", "expected_output": "4", "points": 25}, {"input": "[4,5,6,7,0,1,2]\n3", "expected_output": "-1", "points": 25}, {"input": "[1]\n0", "expected_output": "-1", "points": 25}, {"input": "[1]\n1", "expected_output": "0", "points": 25}]'),

('Subarray Sum K', 'Count subarrays that sum to k.', 'medium', 'arrays', 360,
 '[{"input": "[1,1,1]\n2", "expected_output": "2", "points": 25}, {"input": "[1,2,3]\n3", "expected_output": "2", "points": 25}, {"input": "[1]\n0", "expected_output": "0", "points": 25}, {"input": "[0,0,0]\n0", "expected_output": "6", "points": 25}]'),

('Letter Combinations', 'Return all letter combinations from phone number digits.', 'medium', 'backtracking', 360,
 '[{"input": "23", "expected_output": "[\"ad\",\"ae\",\"af\",\"bd\",\"be\",\"bf\",\"cd\",\"ce\",\"cf\"]", "points": 34}, {"input": "", "expected_output": "[]", "points": 33}, {"input": "2", "expected_output": "[\"a\",\"b\",\"c\"]", "points": 33}]'),

('Sort Colors', 'Sort an array with values 0, 1, 2 (Dutch National Flag).', 'medium', 'arrays', 300,
 '[{"input": "[2,0,2,1,1,0]", "expected_output": "[0,0,1,1,2,2]", "points": 25}, {"input": "[2,0,1]", "expected_output": "[0,1,2]", "points": 25}, {"input": "[0]", "expected_output": "[0]", "points": 25}, {"input": "[1,1,1]", "expected_output": "[1,1,1]", "points": 25}]'),

-- =============================================
-- ADDITIONAL HARD CHALLENGES WITH EDGE CASES
-- =============================================

('Minimum Window', 'Find minimum window substring containing all characters of t.', 'hard', 'strings', 480,
 '[{"input": "ADOBECODEBANC\nABC", "expected_output": "BANC", "points": 25}, {"input": "a\na", "expected_output": "a", "points": 25}, {"input": "a\naa", "expected_output": "", "points": 25}, {"input": "aa\naa", "expected_output": "aa", "points": 25}]'),

('Edit Distance', 'Find minimum operations to convert word1 to word2 (insert, delete, replace).', 'hard', 'dynamic-programming', 420,
 '[{"input": "horse\nros", "expected_output": "3", "points": 25}, {"input": "intention\nexecution", "expected_output": "5", "points": 25}, {"input": "a\na", "expected_output": "0", "points": 25}, {"input": "\nabc", "expected_output": "3", "points": 25}]'),

('Regular Expression', 'Implement regex matching with . and * support.', 'hard', 'dynamic-programming', 480,
 '[{"input": "aa\na", "expected_output": "false", "points": 25}, {"input": "aa\na*", "expected_output": "true", "points": 25}, {"input": "ab\n.*", "expected_output": "true", "points": 25}, {"input": "aab\nc*a*b", "expected_output": "true", "points": 25}]'),

('Largest Rectangle', 'Find largest rectangle area in histogram.', 'hard', 'stacks', 420,
 '[{"input": "[2,1,5,6,2,3]", "expected_output": "10", "points": 25}, {"input": "[2,4]", "expected_output": "4", "points": 25}, {"input": "[1]", "expected_output": "1", "points": 25}, {"input": "[0,9]", "expected_output": "9", "points": 25}]'),

('Alien Dictionary', 'Given sorted alien words, find character order.', 'hard', 'graphs', 480,
 '[{"input": "[\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]", "expected_output": "wertf", "points": 34}, {"input": "[\"z\",\"x\"]", "expected_output": "zx", "points": 33}, {"input": "[\"z\",\"x\",\"z\"]", "expected_output": "", "points": 33}]'),

('Burst Balloons', 'Find maximum coins from bursting balloons.', 'hard', 'dynamic-programming', 480,
 '[{"input": "[3,1,5,8]", "expected_output": "167", "points": 25}, {"input": "[1,5]", "expected_output": "10", "points": 25}, {"input": "[1]", "expected_output": "1", "points": 25}, {"input": "[7,9,8,0,7,1,3,5,5,2]", "expected_output": "1582", "points": 25}]'),

('Count Smaller', 'Count smaller elements to the right for each element.', 'hard', 'arrays', 420,
 '[{"input": "[5,2,6,1]", "expected_output": "[2,1,1,0]", "points": 25}, {"input": "[-1]", "expected_output": "[0]", "points": 25}, {"input": "[-1,-1]", "expected_output": "[0,0]", "points": 25}, {"input": "[1,0,2]", "expected_output": "[1,0,0]", "points": 25}]'),

('Longest Increasing Path', 'Find longest increasing path in a matrix.', 'hard', 'dynamic-programming', 480,
 '[{"input": "[[9,9,4],[6,6,8],[2,1,1]]", "expected_output": "4", "points": 25}, {"input": "[[3,4,5],[3,2,6],[2,2,1]]", "expected_output": "4", "points": 25}, {"input": "[[1]]", "expected_output": "1", "points": 25}, {"input": "[[1,2]]", "expected_output": "2", "points": 25}]'),

('Skyline', 'Compute the skyline of buildings.', 'hard', 'divide-conquer', 600,
 '[{"input": "[[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]]", "expected_output": "[[2,10],[3,15],[7,12],[12,0],[15,10],[20,8],[24,0]]", "points": 50}, {"input": "[[0,2,3],[2,5,3]]", "expected_output": "[[0,3],[5,0]]", "points": 50}]'),

('Palindrome Pairs', 'Find all pairs of indices where concatenation is a palindrome.', 'hard', 'strings', 480,
 '[{"input": "[\"abcd\",\"dcba\",\"lls\",\"s\",\"sssll\"]", "expected_output": "[[0,1],[1,0],[3,2],[2,4]]", "points": 34}, {"input": "[\"bat\",\"tab\",\"cat\"]", "expected_output": "[[0,1],[1,0]]", "points": 33}, {"input": "[\"a\",\"\"]", "expected_output": "[[0,1],[1,0]]", "points": 33}]'),

('Smallest Range', 'Find smallest range including at least one number from each of k lists.', 'hard', 'heaps', 480,
 '[{"input": "[[4,10,15,24,26],[0,9,12,20],[5,18,22,30]]", "expected_output": "[20,24]", "points": 34}, {"input": "[[1,2,3],[1,2,3],[1,2,3]]", "expected_output": "[1,1]", "points": 33}, {"input": "[[1],[2],[3]]", "expected_output": "[1,3]", "points": 33}]'),

('Critical Connections', 'Find all critical connections (bridges) in a network.', 'hard', 'graphs', 600,
 '[{"input": "4\n[[0,1],[1,2],[2,0],[1,3]]", "expected_output": "[[1,3]]", "points": 50}, {"input": "2\n[[0,1]]", "expected_output": "[[0,1]]", "points": 50}]'),

-- =============================================  
-- EXPERT CHALLENGES
-- =============================================

('Sudoku Solver', 'Solve a 9x9 Sudoku puzzle.', 'expert', 'backtracking', 900,
 '[{"input": "[[\"5\",\"3\",\".\",\".\",\"7\",\".\",\".\",\".\",\".\"],[\"6\",\".\",\".\",\"1\",\"9\",\"5\",\".\",\".\",\".\"],[\".\",\"9\",\"8\",\".\",\".\",\".\",\".\",\"6\",\".\"],[\"8\",\".\",\".\",\".\",\"6\",\".\",\".\",\".\",\"3\"],[\"4\",\".\",\".\",\"8\",\".\",\"3\",\".\",\".\",\"1\"],[\"7\",\".\",\".\",\".\",\"2\",\".\",\".\",\".\",\"6\"],[\".\",\"6\",\".\",\".\",\".\",\".\",\"2\",\"8\",\".\"],[\".\",\".\",\".\",\"4\",\"1\",\"9\",\".\",\".\",\"5\"],[\".\",\".\",\".\",\".\",\"8\",\".\",\".\",\"7\",\"9\"]]", "expected_output": "[[\"5\",\"3\",\"4\",\"6\",\"7\",\"8\",\"9\",\"1\",\"2\"],[\"6\",\"7\",\"2\",\"1\",\"9\",\"5\",\"3\",\"4\",\"8\"],[\"1\",\"9\",\"8\",\"3\",\"4\",\"2\",\"5\",\"6\",\"7\"],[\"8\",\"5\",\"9\",\"7\",\"6\",\"1\",\"4\",\"2\",\"3\"],[\"4\",\"2\",\"6\",\"8\",\"5\",\"3\",\"7\",\"9\",\"1\"],[\"7\",\"1\",\"3\",\"9\",\"2\",\"4\",\"8\",\"5\",\"6\"],[\"9\",\"6\",\"1\",\"5\",\"3\",\"7\",\"2\",\"8\",\"4\"],[\"2\",\"8\",\"7\",\"4\",\"1\",\"9\",\"6\",\"3\",\"5\"],[\"3\",\"4\",\"5\",\"2\",\"8\",\"6\",\"1\",\"7\",\"9\"]]", "points": 100}]'),

('Word Search II', 'Find all words from dictionary that exist in the board.', 'expert', 'tries', 900,
 '[{"input": "[[\"o\",\"a\",\"a\",\"n\"],[\"e\",\"t\",\"a\",\"e\"],[\"i\",\"h\",\"k\",\"r\"],[\"i\",\"f\",\"l\",\"v\"]]\n[\"oath\",\"pea\",\"eat\",\"rain\"]", "expected_output": "[\"eat\",\"oath\"]", "points": 50}, {"input": "[[\"a\",\"b\"],[\"c\",\"d\"]]\n[\"abcb\"]", "expected_output": "[]", "points": 50}]'),

('Prefix and Suffix', 'Design WordFilter with prefix and suffix search.', 'expert', 'design', 900,
 '[{"input": "apple\nf:a,s:e", "expected_output": "0", "points": 50}, {"input": "test\nf:t,s:t", "expected_output": "0", "points": 50}]'),

('Maximum Frequency Stack', 'Design a stack that pops most frequent element.', 'expert', 'design', 900,
 '[{"input": "push(5)\npush(7)\npush(5)\npush(7)\npush(4)\npush(5)\npop()\npop()\npop()\npop()", "expected_output": "5\n7\n5\n4", "points": 100}]'),

('Shortest Superstring', 'Find shortest string containing all given strings as substrings.', 'expert', 'dynamic-programming', 1200,
 '[{"input": "[\"alex\",\"loves\",\"leetcode\"]", "expected_output": "alexlovesleetcode", "points": 50}, {"input": "[\"catg\",\"ctaagt\",\"gcta\",\"ttca\",\"atgcatc\"]", "expected_output": "gctaagttcatgcatc", "points": 50}]')

ON CONFLICT DO NOTHING;

-- =============================================
-- DAILY CHALLENGES AUTO-GENERATION
-- =============================================
-- Daily challenges are now auto-generated from the duel_challenges pool.
-- The API (app/api/daily/route.ts) selects a challenge deterministically based on the date.
-- No manual seeding required - just ensure duel_challenges table is populated.

-- Difficulty selection by day of week:
-- Monday-Tuesday: Easy
-- Wednesday-Friday: Medium
-- Saturday-Sunday: Hard

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Update streak on daily completion
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id VARCHAR(255),
  p_xp_earned INTEGER DEFAULT 100
)
RETURNS TABLE (
  new_streak INTEGER,
  streak_bonus DECIMAL,
  total_xp INTEGER
) AS $$
DECLARE
  v_streak user_streaks%ROWTYPE;
  v_new_streak INTEGER;
  v_bonus DECIMAL := 1.0;
  v_total_xp INTEGER;
BEGIN
  -- Get or create streak record
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_completed_date, total_daily_completed, total_xp_earned)
    VALUES (p_user_id, 1, 1, CURRENT_DATE, 1, p_xp_earned)
    RETURNING current_streak, 1.0, total_xp_earned INTO v_new_streak, v_bonus, v_total_xp;
  ELSE
    -- Check if continuing streak
    IF v_streak.last_completed_date = CURRENT_DATE - INTERVAL '1 day' THEN
      v_new_streak := v_streak.current_streak + 1;
      v_bonus := LEAST(1.0 + (v_new_streak * 0.1), 2.0); -- Max 2x bonus
    ELSIF v_streak.last_completed_date = CURRENT_DATE THEN
      -- Already completed today
      RETURN QUERY SELECT v_streak.current_streak, 1.0::DECIMAL, v_streak.total_xp_earned;
      RETURN;
    ELSE
      -- Streak broken
      v_new_streak := 1;
      v_bonus := 1.0;
    END IF;
    
    v_total_xp := v_streak.total_xp_earned + ROUND(p_xp_earned * v_bonus);
    
    UPDATE user_streaks SET
      current_streak = v_new_streak,
      longest_streak = GREATEST(longest_streak, v_new_streak),
      last_completed_date = CURRENT_DATE,
      total_daily_completed = total_daily_completed + 1,
      total_xp_earned = v_total_xp,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT v_new_streak, v_bonus, v_total_xp;
END;
$$ LANGUAGE plpgsql;

-- Check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(
  p_user_id VARCHAR(255),
  p_category VARCHAR(50),
  p_metric_type VARCHAR(50),
  p_metric_value INTEGER
)
RETURNS TABLE (
  unlocked_achievement_id UUID,
  achievement_name VARCHAR(255),
  xp_earned INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT a.id, a.name, a.xp_reward
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE a.is_active = TRUE
      AND a.category = p_category
      AND a.requirement_type = p_metric_type
      AND a.requirement_value <= p_metric_value
      AND (ua.unlocked IS NULL OR ua.unlocked = FALSE)
  ),
  newly_unlocked AS (
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked, unlocked_at)
    SELECT p_user_id, e.id, p_metric_value, TRUE, NOW()
    FROM eligible e
    ON CONFLICT (user_id, achievement_id) 
    DO UPDATE SET unlocked = TRUE, unlocked_at = NOW(), progress = p_metric_value
    WHERE user_achievements.unlocked = FALSE
    RETURNING achievement_id
  )
  SELECT e.id, e.name, e.xp_reward
  FROM eligible e
  JOIN newly_unlocked nu ON nu.achievement_id = e.id;
END;
$$ LANGUAGE plpgsql;

-- Update organization stats
CREATE OR REPLACE FUNCTION update_org_stats(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO organization_stats (organization_id, total_members, avg_skill_rating, updated_at)
  SELECT 
    p_org_id,
    COUNT(DISTINCT om.user_id),
    COALESCE(AVG(ur.skill_rating), 1000),
    NOW()
  FROM organization_members om
  LEFT JOIN user_ratings ur ON ur.user_id = om.user_id
  WHERE om.organization_id = p_org_id
  ON CONFLICT (organization_id) DO UPDATE SET
    total_members = EXCLUDED.total_members,
    avg_skill_rating = EXCLUDED.avg_skill_rating,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FRIENDS SYSTEM
-- =============================================

-- Friend requests and friendships
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  friend_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- User online status
CREATE TABLE IF NOT EXISTS user_presence (
  user_id VARCHAR(255) PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_activity VARCHAR(100), -- 'in_duel', 'in_competition', 'browsing', etc.
  activity_details JSONB DEFAULT '{}'
);

-- =============================================
-- NOTIFICATIONS SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'friend_request', 'duel_invite', 'achievement', 'competition_start', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}', -- Additional data like links, IDs
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  email_friend_requests BOOLEAN DEFAULT TRUE,
  email_duel_invites BOOLEAN DEFAULT TRUE,
  email_competition_reminders BOOLEAN DEFAULT TRUE,
  email_achievements BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TUTORIAL SYSTEM
-- =============================================

-- Tutorial lessons
CREATE TABLE IF NOT EXISTS tutorial_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'basics', 'arrays', 'strings', 'algorithms', 'data-structures'
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  order_index INTEGER DEFAULT 0,
  content TEXT NOT NULL, -- Markdown content with explanations
  hints JSONB DEFAULT '[]', -- Array of hints that unlock progressively
  starter_code JSONB DEFAULT '{}', -- {language: code}
  solution_code JSONB DEFAULT '{}', -- {language: code}
  test_cases JSONB NOT NULL,
  xp_reward INTEGER DEFAULT 25,
  estimated_minutes INTEGER DEFAULT 10,
  prerequisites UUID[] DEFAULT '{}', -- Array of lesson IDs that should be completed first
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tutorial_lessons_category ON tutorial_lessons(category);
CREATE INDEX IF NOT EXISTS idx_tutorial_lessons_difficulty ON tutorial_lessons(difficulty);
CREATE INDEX IF NOT EXISTS idx_tutorial_lessons_order ON tutorial_lessons(category, order_index);

-- User tutorial progress
CREATE TABLE IF NOT EXISTS tutorial_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  lesson_id UUID NOT NULL REFERENCES tutorial_lessons(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  hints_used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  best_code TEXT,
  best_language VARCHAR(50),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user ON tutorial_progress(user_id);

-- =============================================
-- GLOBAL LEADERBOARD VIEWS
-- =============================================

-- Skill rating leaderboard
CREATE OR REPLACE VIEW skill_leaderboard AS
SELECT 
  ur.user_id,
  u.name as username,
  ur.skill_rating,
  ur.skill_tier,
  ur.total_competitions,
  ur.total_wins,
  COALESCE(ds.duel_wins, 0) as duel_wins,
  COALESCE(ds.duel_losses, 0) as duel_losses,
  COALESCE(us.current_streak, 0) as daily_streak,
  COALESCE(us.total_xp_earned, 0) as total_xp,
  ROW_NUMBER() OVER (ORDER BY ur.skill_rating DESC) as rank
FROM user_ratings ur
LEFT JOIN "user" u ON u.id = ur.user_id
LEFT JOIN (
  SELECT 
    CASE WHEN winner_id = player1_id THEN player1_id ELSE player2_id END as user_id,
    COUNT(*) FILTER (WHERE winner_id IS NOT NULL) as duel_wins,
    0 as duel_losses
  FROM duels WHERE status = 'completed'
  GROUP BY 1
) ds ON ds.user_id = ur.user_id
LEFT JOIN user_streaks us ON us.user_id = ur.user_id
ORDER BY ur.skill_rating DESC;

-- Weekly leaderboard (competitions won this week)
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
  l.user_id,
  u.name as username,
  COUNT(*) FILTER (WHERE l.rank = 1) as wins_this_week,
  SUM(l.best_score) as total_score,
  COALESCE(ur.skill_rating, 1000) as skill_rating,
  ROW_NUMBER() OVER (ORDER BY COUNT(*) FILTER (WHERE l.rank = 1) DESC, SUM(l.best_score) DESC) as rank
FROM leaderboard l
JOIN competitions c ON c.id = l.competition_id
LEFT JOIN "user" u ON u.id = l.user_id
LEFT JOIN user_ratings ur ON ur.user_id = l.user_id
WHERE c.end_date >= NOW() - INTERVAL '7 days'
GROUP BY l.user_id, u.name, ur.skill_rating
ORDER BY wins_this_week DESC, total_score DESC;

-- =============================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;

-- Friends policies
CREATE POLICY "Users can see their own friendships" ON friendships FOR SELECT USING (true);
CREATE POLICY "Users can create friend requests" ON friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their friendships" ON friendships FOR UPDATE USING (true);
CREATE POLICY "Users can delete their friendships" ON friendships FOR DELETE USING (true);

-- Presence policies
CREATE POLICY "Anyone can see online status" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users can update their presence" ON user_presence FOR ALL USING (true);

-- Notification policies
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (true);

-- Notification preferences
CREATE POLICY "Users manage own preferences" ON notification_preferences FOR ALL USING (true);

-- Tutorial policies
CREATE POLICY "Anyone can view tutorials" ON tutorial_lessons FOR SELECT USING (true);
CREATE POLICY "Users track own progress" ON tutorial_progress FOR ALL USING (true);

-- =============================================
-- SEED TUTORIAL LESSONS
-- =============================================

INSERT INTO tutorial_lessons (slug, title, description, category, difficulty, order_index, content, hints, starter_code, solution_code, test_cases, xp_reward, estimated_minutes) VALUES

-- BASICS
('hello-world', 'Hello World', 'Learn to output text to the console', 'basics', 'beginner', 1,
'# Hello World

Welcome to coding! In this first lesson, you''ll learn how to output text.

## What you''ll learn
- How to print text to the console
- Basic syntax of your chosen language

## Instructions
Write a program that outputs: `Hello, World!`

Make sure to match the exact text, including capitalization and punctuation!',
'["Use the print function", "In Python: print(\"Hello, World!\")", "In JavaScript: console.log(\"Hello, World!\")"]',
'{"python": "# Write your code here\n", "javascript": "// Write your code here\n"}',
'{"python": "print(\"Hello, World!\")", "javascript": "console.log(\"Hello, World!\")"}',
'[{"input": "", "expected_output": "Hello, World!", "points": 100}]',
10, 5),

('variables', 'Variables', 'Learn how to store and use data', 'basics', 'beginner', 2,
'# Variables

Variables are containers for storing data values.

## What you''ll learn
- How to declare variables
- How to assign values
- How to use variables in output

## Instructions
Create a variable called `name` with the value `"CodeComp"`, then print: `Welcome to CodeComp!`',
'["Declare a variable first", "Use the variable in your print statement", "String concatenation or f-strings work"]',
'{"python": "# Create a variable and use it\n", "javascript": "// Create a variable and use it\n"}',
'{"python": "name = \"CodeComp\"\nprint(f\"Welcome to {name}!\")", "javascript": "const name = \"CodeComp\";\nconsole.log(`Welcome to ${name}!`);"}',
'[{"input": "", "expected_output": "Welcome to CodeComp!", "points": 100}]',
15, 8),

('input-output', 'Input and Output', 'Learn to read user input', 'basics', 'beginner', 3,
'# Input and Output

Programs often need to interact with users by reading input and displaying output.

## What you''ll learn
- How to read input
- How to process input
- How to display results

## Instructions
Read a name from input, then print: `Hello, [name]!`

For example, if input is `Alice`, output should be `Hello, Alice!`',
'["Read from standard input", "Combine the greeting with the name", "Don''t forget the exclamation mark"]',
'{"python": "# Read input and greet the user\n", "javascript": "// Read input and greet the user\nconst readline = require(\"readline\");\n"}',
'{"python": "name = input()\nprint(f\"Hello, {name}!\")", "javascript": "const name = require(\"fs\").readFileSync(0, \"utf-8\").trim();\nconsole.log(`Hello, ${name}!`);"}',
'[{"input": "Alice", "expected_output": "Hello, Alice!", "points": 50}, {"input": "Bob", "expected_output": "Hello, Bob!", "points": 50}]',
20, 10),

('conditionals', 'Conditionals', 'Learn to make decisions in code', 'basics', 'beginner', 4,
'# Conditionals

Conditionals allow your program to make decisions based on conditions.

## What you''ll learn
- if/else statements
- Comparison operators
- Boolean logic

## Instructions
Read a number. If it''s positive, print `positive`. If it''s negative, print `negative`. If it''s zero, print `zero`.',
'["Use if-elif-else (Python) or if-else if-else (JS)", "Compare the number to 0", "Remember: 0 is neither positive nor negative"]',
'{"python": "# Read a number and classify it\n", "javascript": "// Read a number and classify it\n"}',
'{"python": "n = int(input())\nif n > 0:\n    print(\"positive\")\nelif n < 0:\n    print(\"negative\")\nelse:\n    print(\"zero\")", "javascript": "const n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\nif (n > 0) console.log(\"positive\");\nelse if (n < 0) console.log(\"negative\");\nelse console.log(\"zero\");"}',
'[{"input": "5", "expected_output": "positive", "points": 34}, {"input": "-3", "expected_output": "negative", "points": 33}, {"input": "0", "expected_output": "zero", "points": 33}]',
25, 12),

('loops', 'Loops', 'Learn to repeat code', 'basics', 'beginner', 5,
'# Loops

Loops let you repeat code multiple times without writing it over and over.

## What you''ll learn
- for loops
- while loops
- Loop control

## Instructions
Read a number N, then print numbers from 1 to N, each on a new line.',
'["Use a for loop", "Range in Python is range(1, n+1)", "In JS, use a standard for loop"]',
'{"python": "# Print numbers from 1 to N\n", "javascript": "// Print numbers from 1 to N\n"}',
'{"python": "n = int(input())\nfor i in range(1, n + 1):\n    print(i)", "javascript": "const n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\nfor (let i = 1; i <= n; i++) console.log(i);"}',
'[{"input": "5", "expected_output": "1\n2\n3\n4\n5", "points": 50}, {"input": "3", "expected_output": "1\n2\n3", "points": 50}]',
25, 12),

-- ARRAYS
('array-basics', 'Array Basics', 'Learn to work with collections of data', 'arrays', 'beginner', 1,
'# Arrays

Arrays (or lists) store multiple values in a single variable.

## What you''ll learn
- Creating arrays
- Accessing elements
- Array length

## Instructions
Read N numbers (first line is N, then N numbers follow). Print them in reverse order, space-separated.',
'["Read N first, then read N numbers", "Store in an array/list", "Reverse and join with spaces"]',
'{"python": "# Reverse an array\n", "javascript": "// Reverse an array\n"}',
'{"python": "n = int(input())\narr = [int(input()) for _ in range(n)]\nprint(\" \".join(map(str, arr[::-1])))", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst n = parseInt(lines[0]);\nconst arr = lines.slice(1, n + 1).map(Number);\nconsole.log(arr.reverse().join(\" \"));"}',
'[{"input": "5\n1\n2\n3\n4\n5", "expected_output": "5 4 3 2 1", "points": 50}, {"input": "3\n10\n20\n30", "expected_output": "30 20 10", "points": 50}]',
30, 15),

('array-sum', 'Array Sum', 'Calculate the sum of array elements', 'arrays', 'beginner', 2,
'# Array Sum

A common operation is summing all elements in an array.

## What you''ll learn
- Iterating through arrays
- Accumulating values
- Built-in sum functions

## Instructions
Read an array of numbers (first line is N, second line is N space-separated numbers). Print their sum.',
'["Split the second line by spaces", "Convert to integers", "Use sum() in Python or reduce in JS"]',
'{"python": "# Sum array elements\n", "javascript": "// Sum array elements\n"}',
'{"python": "n = int(input())\narr = list(map(int, input().split()))\nprint(sum(arr))", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst arr = lines[1].split(\" \").map(Number);\nconsole.log(arr.reduce((a, b) => a + b, 0));"}',
'[{"input": "5\n1 2 3 4 5", "expected_output": "15", "points": 50}, {"input": "3\n10 -5 3", "expected_output": "8", "points": 50}]',
30, 12),

('find-max', 'Find Maximum', 'Find the largest element in an array', 'arrays', 'beginner', 3,
'# Finding Maximum

Finding the maximum (or minimum) value is a fundamental array operation.

## What you''ll learn
- Comparing elements
- Tracking the best value
- Using built-in functions

## Instructions
Read an array of numbers and print the maximum value.',
'["Initialize max with the first element or negative infinity", "Compare each element", "Or use built-in max() function"]',
'{"python": "# Find the maximum\n", "javascript": "// Find the maximum\n"}',
'{"python": "n = int(input())\narr = list(map(int, input().split()))\nprint(max(arr))", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst arr = lines[1].split(\" \").map(Number);\nconsole.log(Math.max(...arr));"}',
'[{"input": "5\n3 1 4 1 5", "expected_output": "5", "points": 50}, {"input": "4\n-5 -2 -10 -1", "expected_output": "-1", "points": 50}]',
30, 10),

-- STRINGS
('string-basics', 'String Basics', 'Learn to manipulate text', 'strings', 'beginner', 1,
'# String Basics

Strings are sequences of characters used to represent text.

## What you''ll learn
- String length
- Accessing characters
- String methods

## Instructions
Read a string and print its length.',
'["Use len() in Python", "Use .length in JavaScript", "No need to import anything"]',
'{"python": "# Print string length\n", "javascript": "// Print string length\n"}',
'{"python": "s = input()\nprint(len(s))", "javascript": "const s = require(\"fs\").readFileSync(0, \"utf-8\").trim();\nconsole.log(s.length);"}',
'[{"input": "hello", "expected_output": "5", "points": 50}, {"input": "CodeComp", "expected_output": "8", "points": 50}]',
20, 8),

('string-reverse', 'Reverse String', 'Reverse a string', 'strings', 'beginner', 2,
'# Reverse a String

Reversing a string is a classic programming exercise.

## What you''ll learn
- String slicing
- Building strings
- Multiple approaches

## Instructions
Read a string and print it reversed.',
'["In Python, use [::-1] slicing", "In JS, split, reverse, and join", "Or use a loop"]',
'{"python": "# Reverse the string\n", "javascript": "// Reverse the string\n"}',
'{"python": "s = input()\nprint(s[::-1])", "javascript": "const s = require(\"fs\").readFileSync(0, \"utf-8\").trim();\nconsole.log(s.split(\"\").reverse().join(\"\"));"}',
'[{"input": "hello", "expected_output": "olleh", "points": 50}, {"input": "CodeComp", "expected_output": "pmoCedoC", "points": 50}]',
25, 10),

('palindrome', 'Palindrome Check', 'Check if a string is a palindrome', 'strings', 'intermediate', 3,
'# Palindrome Check

A palindrome reads the same forwards and backwards.

## What you''ll learn
- String comparison
- Two-pointer technique
- Case handling

## Instructions
Read a string and print `true` if it''s a palindrome (case-insensitive), `false` otherwise. Ignore non-alphanumeric characters.',
'["Convert to lowercase first", "Remove non-alphanumeric characters", "Compare with its reverse"]',
'{"python": "# Check palindrome\n", "javascript": "// Check palindrome\n"}',
'{"python": "import re\ns = input().lower()\ns = re.sub(r\"[^a-z0-9]\", \"\", s)\nprint(\"true\" if s == s[::-1] else \"false\")", "javascript": "const s = require(\"fs\").readFileSync(0, \"utf-8\").trim().toLowerCase().replace(/[^a-z0-9]/g, \"\");\nconsole.log(s === s.split(\"\").reverse().join(\"\") ? \"true\" : \"false\");"}',
'[{"input": "racecar", "expected_output": "true", "points": 34}, {"input": "hello", "expected_output": "false", "points": 33}, {"input": "A man a plan a canal Panama", "expected_output": "true", "points": 33}]',
35, 15),

-- ALGORITHMS
('binary-search', 'Binary Search', 'Efficiently search sorted data', 'algorithms', 'intermediate', 1,
'# Binary Search

Binary search finds elements in O(log n) time by repeatedly dividing the search space in half.

## What you''ll learn
- Divide and conquer
- O(log n) complexity
- Search algorithms

## Instructions
Given a sorted array and a target, return the index of the target or -1 if not found.',
'["Compare target with middle element", "If target is smaller, search left half", "If target is larger, search right half"]',
'{"python": "# Binary search implementation\n", "javascript": "// Binary search implementation\n"}',
'{"python": "def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nline1 = input().strip()\narr = list(map(int, line1[1:-1].split(\",\"))) if line1 != \"[]\" else []\ntarget = int(input())\nprint(binary_search(arr, target))", "javascript": "function binarySearch(arr, target) {\n    let left = 0, right = arr.length - 1;\n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (arr[mid] === target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}\nconst lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst arr = JSON.parse(lines[0]);\nconst target = parseInt(lines[1]);\nconsole.log(binarySearch(arr, target));"}',
'[{"input": "[1,2,3,4,5,6,7]\n4", "expected_output": "3", "points": 34}, {"input": "[1,3,5,7,9]\n6", "expected_output": "-1", "points": 33}, {"input": "[1]\n1", "expected_output": "0", "points": 33}]',
50, 20),

('two-pointers', 'Two Pointers', 'Solve problems with two moving pointers', 'algorithms', 'intermediate', 2,
'# Two Pointers Technique

The two-pointer technique uses two indices to traverse data efficiently.

## What you''ll learn
- Two-pointer pattern
- O(n) solutions
- Array manipulation

## Instructions
Given a sorted array, find two numbers that sum to a target. Return their indices (1-indexed).',
'["Start with pointers at both ends", "If sum is too small, move left pointer right", "If sum is too large, move right pointer left"]',
'{"python": "# Two pointer solution\n", "javascript": "// Two pointer solution\n"}',
'{"python": "def two_sum(arr, target):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        s = arr[left] + arr[right]\n        if s == target:\n            return [left + 1, right + 1]\n        elif s < target:\n            left += 1\n        else:\n            right -= 1\n    return [-1, -1]\n\nline1 = input().strip()\narr = list(map(int, line1[1:-1].split(\",\"))) if line1 != \"[]\" else []\ntarget = int(input())\nprint(two_sum(arr, target))", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst arr = JSON.parse(lines[0]);\nconst target = parseInt(lines[1]);\nlet l = 0, r = arr.length - 1;\nwhile (l < r) {\n    const s = arr[l] + arr[r];\n    if (s === target) { console.log([l + 1, r + 1]); process.exit(); }\n    if (s < target) l++; else r--;\n}\nconsole.log([-1, -1]);"}',
'[{"input": "[2,7,11,15]\n9", "expected_output": "[1, 2]", "points": 50}, {"input": "[2,3,4]\n6", "expected_output": "[1, 3]", "points": 50}]',
50, 18)

ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id VARCHAR(255),
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Get friend count
CREATE OR REPLACE FUNCTION get_friend_count(p_user_id VARCHAR(255))
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM friendships
    WHERE (user_id = p_user_id OR friend_id = p_user_id)
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Update user presence
CREATE OR REPLACE FUNCTION update_presence(
  p_user_id VARCHAR(255),
  p_is_online BOOLEAN DEFAULT TRUE,
  p_activity VARCHAR(100) DEFAULT 'browsing',
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen, current_activity, activity_details)
  VALUES (p_user_id, p_is_online, NOW(), p_activity, p_details)
  ON CONFLICT (user_id) DO UPDATE SET
    is_online = p_is_online,
    last_seen = NOW(),
    current_activity = p_activity,
    activity_details = p_details;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- USER PROFILE CUSTOMIZATION
-- =============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(500),
  github_username VARCHAR(100),
  twitter_username VARCHAR(100),
  linkedin_url VARCHAR(500),
  preferred_language VARCHAR(50) DEFAULT 'python',
  theme VARCHAR(20) DEFAULT 'system',
  email_public BOOLEAN DEFAULT FALSE,
  show_activity BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- =============================================
-- CODE PLAYGROUND
-- =============================================

CREATE TABLE IF NOT EXISTS playground_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255),
  title VARCHAR(255) DEFAULT 'Untitled',
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'python',
  input TEXT DEFAULT '',
  last_output TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  share_slug VARCHAR(20) UNIQUE,
  fork_count INTEGER DEFAULT 0,
  forked_from UUID REFERENCES playground_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playground_user ON playground_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_playground_public ON playground_sessions(is_public);
CREATE INDEX IF NOT EXISTS idx_playground_share_slug ON playground_sessions(share_slug);

-- =============================================
-- PRACTICE MODE
-- =============================================

CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  challenge_type VARCHAR(50) NOT NULL, -- 'duel_challenge', 'daily_challenge', 'competition'
  challenge_id UUID NOT NULL,
  original_duel_id UUID, -- If practicing from a past duel
  code TEXT,
  language VARCHAR(50) NOT NULL,
  score INTEGER DEFAULT 0,
  tests_passed INTEGER DEFAULT 0,
  tests_total INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  best_score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_practice_user ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_challenge ON practice_sessions(challenge_type, challenge_id);

-- =============================================
-- COMPETITION & ARENA INVITES
-- =============================================

CREATE TABLE IF NOT EXISTS competition_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  created_by VARCHAR(255) NOT NULL,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arena_id UUID REFERENCES arenas(id) ON DELETE CASCADE,
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  created_by VARCHAR(255) NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(50) DEFAULT 'participant', -- 'participant' or 'judge'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_type VARCHAR(20) NOT NULL, -- 'competition' or 'arena'
  invite_id UUID NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invite_type, invite_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comp_invites_code ON competition_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_arena_invites_code ON arena_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invite_redemptions_user ON invite_redemptions(user_id);

-- =============================================
-- CODE DIFF / SUBMISSION COMPARISON
-- =============================================

CREATE TABLE IF NOT EXISTS submission_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  submission_a_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  submission_b_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_user ON submission_comparisons(user_id);

-- =============================================
-- REALTIME DUEL STATE (for Supabase Realtime)
-- =============================================

CREATE TABLE IF NOT EXISTS duel_realtime_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE UNIQUE,
  player1_typing BOOLEAN DEFAULT FALSE,
  player1_last_run TIMESTAMP WITH TIME ZONE,
  player1_tests_passing INTEGER DEFAULT 0,
  player2_typing BOOLEAN DEFAULT FALSE,
  player2_last_run TIMESTAMP WITH TIME ZONE,
  player2_tests_passing INTEGER DEFAULT 0,
  current_phase VARCHAR(50) DEFAULT 'coding', -- 'coding', 'submitted', 'finished'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duel_realtime_duel ON duel_realtime_state(duel_id);

-- Enable realtime for duel state
-- Run: ALTER PUBLICATION supabase_realtime ADD TABLE duel_realtime_state;

-- =============================================
-- CODE TEMPLATES (enhanced)
-- =============================================

-- Add category and tags to existing templates table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'code_templates' AND column_name = 'category') THEN
    ALTER TABLE code_templates ADD COLUMN category VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'code_templates' AND column_name = 'tags') THEN
    ALTER TABLE code_templates ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'code_templates' AND column_name = 'use_count') THEN
    ALTER TABLE code_templates ADD COLUMN use_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'code_templates' AND column_name = 'is_starter') THEN
    ALTER TABLE code_templates ADD COLUMN is_starter BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Seed some starter templates
INSERT INTO code_templates (user_id, name, description, code, language, is_public, category, tags, is_starter)
VALUES
-- Python templates
('system', 'Python - Fast I/O', 'Optimized input/output for competitive programming', 
'import sys
input = sys.stdin.readline

def solve():
    n = int(input())
    arr = list(map(int, input().split()))
    # Your solution here
    print(result)

solve()', 'python', TRUE, 'competitive', ARRAY['io', 'optimization'], TRUE),

('system', 'Python - BFS Template', 'Breadth-first search template',
'from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    
    return visited', 'python', TRUE, 'algorithms', ARRAY['bfs', 'graph'], TRUE),

('system', 'Python - DFS Template', 'Depth-first search template',
'def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    
    visited.add(node)
    
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    
    return visited', 'python', TRUE, 'algorithms', ARRAY['dfs', 'graph', 'recursion'], TRUE),

('system', 'Python - Binary Search', 'Binary search template',
'def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1  # Not found

# For finding insertion point:
# import bisect
# bisect.bisect_left(arr, target)', 'python', TRUE, 'algorithms', ARRAY['binary-search', 'search'], TRUE),

-- JavaScript templates
('system', 'JavaScript - Fast I/O', 'Optimized input for competitive programming',
'const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin });
const lines = [];

rl.on("line", (line) => lines.push(line));
rl.on("close", () => {
    let idx = 0;
    const read = () => lines[idx++];
    
    // Your solution here
    const n = parseInt(read());
    const arr = read().split(" ").map(Number);
    
    console.log(result);
});', 'javascript', TRUE, 'competitive', ARRAY['io', 'optimization'], TRUE),

('system', 'JavaScript - Graph BFS', 'BFS template for JavaScript',
'function bfs(graph, start) {
    const visited = new Set([start]);
    const queue = [start];
    
    while (queue.length > 0) {
        const node = queue.shift();
        for (const neighbor of graph[node] || []) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    
    return visited;
}', 'javascript', TRUE, 'algorithms', ARRAY['bfs', 'graph'], TRUE)

ON CONFLICT DO NOTHING;

-- =============================================
-- GENERATE INVITE CODE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(20) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE COMPETITION INVITE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION create_competition_invite(
  p_competition_id UUID,
  p_user_id VARCHAR(255),
  p_max_uses INTEGER DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS competition_invites AS $$
DECLARE
  v_invite competition_invites;
  v_code VARCHAR(20);
BEGIN
  -- Generate unique code
  LOOP
    v_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM competition_invites WHERE invite_code = v_code);
  END LOOP;
  
  INSERT INTO competition_invites (competition_id, invite_code, created_by, max_uses, expires_at)
  VALUES (
    p_competition_id, 
    v_code, 
    p_user_id, 
    p_max_uses,
    CASE WHEN p_expires_in_days IS NOT NULL 
         THEN NOW() + (p_expires_in_days || ' days')::interval 
         ELSE NULL END
  )
  RETURNING * INTO v_invite;
  
  RETURN v_invite;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE ARENA INVITE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION create_arena_invite(
  p_arena_id UUID,
  p_user_id VARCHAR(255),
  p_role VARCHAR(50) DEFAULT 'participant',
  p_max_uses INTEGER DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS arena_invites AS $$
DECLARE
  v_invite arena_invites;
  v_code VARCHAR(20);
BEGIN
  LOOP
    v_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM arena_invites WHERE invite_code = v_code);
  END LOOP;
  
  INSERT INTO arena_invites (arena_id, invite_code, created_by, role, max_uses, expires_at)
  VALUES (
    p_arena_id, 
    v_code, 
    p_user_id, 
    p_role,
    p_max_uses,
    CASE WHEN p_expires_in_days IS NOT NULL 
         THEN NOW() + (p_expires_in_days || ' days')::interval 
         ELSE NULL END
  )
  RETURNING * INTO v_invite;
  
  RETURN v_invite;
END;
$$ LANGUAGE plpgsql;
