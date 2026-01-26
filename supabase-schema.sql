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
CREATE INDEX IF NOT EXISTS idx_submissions_competition ON submissions(competition_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_competition ON test_cases(competition_id);
CREATE INDEX IF NOT EXISTS idx_judges_competition ON judges(competition_id);
CREATE INDEX IF NOT EXISTS idx_prizes_competition ON prizes(competition_id);

-- Row Level Security (RLS) policies
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- Competitions: Anyone can read, only creator can update/delete
CREATE POLICY "Anyone can view competitions" ON competitions FOR SELECT USING (true);
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
