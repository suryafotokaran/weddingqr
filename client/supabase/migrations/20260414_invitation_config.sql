-- Add invitation_config JSONB column to events table
-- Stores the full web invitation state (theme, data, hidden sections, etc.)
ALTER TABLE events ADD COLUMN IF NOT EXISTS invitation_config JSONB;
