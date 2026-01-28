-- Migration: Add invite_code column to competitions table for private competitions
-- Run this SQL in your Supabase SQL Editor

-- Add invite_code column to competitions table
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20);

-- Create an index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_competitions_invite_code ON competitions(invite_code);

-- Add a function to generate invite codes automatically for new private competitions
-- Note: This is optional, you can also generate codes in the application layer

-- Update existing private competitions to have an invite code
UPDATE competitions 
SET invite_code = UPPER(ENCODE(GEN_RANDOM_BYTES(6), 'hex'))
WHERE is_public = FALSE AND invite_code IS NULL;

-- Add a trigger to auto-generate invite code when competition is made private
CREATE OR REPLACE FUNCTION generate_competition_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate invite code if competition is private and doesn't have one
  IF NEW.is_public = FALSE AND NEW.invite_code IS NULL THEN
    NEW.invite_code := UPPER(ENCODE(GEN_RANDOM_BYTES(6), 'hex'));
  END IF;
  
  -- Clear invite code if competition is made public
  IF NEW.is_public = TRUE THEN
    NEW.invite_code := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_competition_invite_code ON competitions;
CREATE TRIGGER trigger_competition_invite_code
  BEFORE INSERT OR UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_competition_invite_code();
