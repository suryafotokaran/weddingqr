-- Guest comments per photo (feedback to photographer)
CREATE TABLE IF NOT EXISTS photo_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id    UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id    TEXT NOT NULL,
  guest_name  TEXT,
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_event ON photo_comments(event_id);

ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_comments_all" ON photo_comments
  FOR ALL USING (true) WITH CHECK (true);
