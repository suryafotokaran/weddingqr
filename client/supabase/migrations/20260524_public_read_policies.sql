-- Allow unauthenticated (anon) guests to read events and photos.
-- Without this, guests on mobile (no active session) hit RLS and get 0 rows.

-- Events: anon needs to read the event to show the guest view
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_read" ON events;
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (true);

-- Photos: anon needs to read photos for the guest gallery
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_public_read" ON photos;
CREATE POLICY "photos_public_read" ON photos
  FOR SELECT USING (true);
