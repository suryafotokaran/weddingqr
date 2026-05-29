-- ─── RPC: GET USER TOTAL PHOTO STORAGE (bytes) ──────────────────────────────
-- Sums size_bytes for all photos owned by the user.
-- Uses DB-side aggregation to avoid Supabase max-rows limit.
CREATE OR REPLACE FUNCTION get_user_photo_storage(p_user_id uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(size_bytes), 0)::bigint
  FROM photos
  WHERE user_id = p_user_id;
$$;

-- ─── RPC: GET EVENT TOTAL PHOTO STORAGE (bytes) ──────────────────────────────
-- Sums size_bytes for all photos in a given event.
CREATE OR REPLACE FUNCTION get_event_photo_storage(p_event_id uuid)
RETURNS bigint LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(SUM(size_bytes), 0)::bigint
  FROM photos
  WHERE event_id = p_event_id;
$$;

-- ─── RPC: GET PHOTO COUNT FOR AN EVENT BY SOURCE ────────────────────────────
CREATE OR REPLACE FUNCTION get_event_photo_count(p_event_id uuid, p_source text DEFAULT NULL)
RETURNS int LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(COUNT(id)::int, 0)
  FROM photos
  WHERE event_id = p_event_id
    AND (p_source IS NULL OR source = p_source);
$$;

GRANT EXECUTE ON FUNCTION get_event_photo_count(uuid, text) TO authenticated;

-- ─── RPC: GET ALL PHOTO STORAGE PATHS FOR AN EVENT ──────────────────────────
-- Returns every storage_path for the event (no row limit).
CREATE OR REPLACE FUNCTION get_event_photo_paths(p_event_id uuid)
RETURNS text[] LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(ARRAY_AGG(storage_path), ARRAY[]::text[])
  FROM photos
  WHERE event_id = p_event_id
    AND storage_path IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_user_photo_storage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_photo_storage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_photo_paths(uuid) TO authenticated;
