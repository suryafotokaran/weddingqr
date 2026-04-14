-- Replace single-comment with conversation thread per photo
DROP TABLE IF EXISTS photo_comments;

CREATE TABLE photo_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id    UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'photographer')),
  sender_id   TEXT NOT NULL,   -- guest_id (UUID string) or photographer user_id
  sender_name TEXT,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_event ON photo_comments(event_id);

ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_comments_all" ON photo_comments
  FOR ALL USING (true) WITH CHECK (true);
