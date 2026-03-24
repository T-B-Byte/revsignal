-- Add outreach_date to prospects for tracking when initial outreach was made
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS outreach_date timestamptz;
