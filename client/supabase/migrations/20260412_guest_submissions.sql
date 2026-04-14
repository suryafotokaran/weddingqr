-- Guest photo selection submissions
CREATE TABLE IF NOT EXISTS guest_submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id      TEXT NOT NULL,
  guest_name    TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  photo_count   INTEGER DEFAULT 0,
  is_locked     BOOLEAN DEFAULT TRUE,
  UNIQUE(event_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_submissions_event ON guest_submissions(event_id);

ALTER TABLE guest_submissions ENABLE ROW LEVEL SECURITY;

-- Allow guests and hosts to read/write submissions
CREATE POLICY "guest_submissions_all" ON guest_submissions
  FOR ALL USING (true) WITH CHECK (true);
