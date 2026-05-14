-- ============================================================
-- Fix: embedding column is pgvector `vector` type.
-- Cast chain: vector → text → json to parse the float array.
-- Drop ALL overloads first, then recreate cleanly.
-- Run this in Supabase SQL Editor.
-- ============================================================

DROP FUNCTION IF EXISTS public.match_faces(vector,  float8, int, uuid);
DROP FUNCTION IF EXISTS public.match_faces(text,    float8, int, uuid);
DROP FUNCTION IF EXISTS public.match_faces(vector,  double precision, integer, uuid);
DROP FUNCTION IF EXISTS public.match_faces(text,    double precision, integer, uuid);

CREATE OR REPLACE FUNCTION public.match_faces(
  query_embedding  text,
  match_threshold  float8,
  match_count      int,
  p_event_id       uuid
)
RETURNS TABLE (photo_id uuid, similarity float8)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  q_arr float8[];
  e_arr float8[];
  r     RECORD;
  dist  float8;
  diff  float8;
  i     int;
  n     int;
BEGIN
  -- Parse query embedding text "[0.1,-0.2,...]" → float8[]
  SELECT array_agg(val::float8)
    INTO q_arr
    FROM json_array_elements_text(query_embedding::json) AS val;

  n := array_length(q_arr, 1);

  FOR r IN
    SELECT fe.photo_id, fe.embedding
    FROM   face_embeddings fe
    JOIN   photos p ON p.id = fe.photo_id
    WHERE  p.event_id = p_event_id
  LOOP
    -- embedding column is pgvector `vector` type:
    -- cast vector → text → json to extract floats
    SELECT array_agg(val::float8)
      INTO e_arr
      FROM json_array_elements_text(r.embedding::text::json) AS val;

    IF array_length(e_arr, 1) IS NULL OR array_length(e_arr, 1) != n THEN
      CONTINUE;
    END IF;

    -- Euclidean distance (same metric face-api.js uses internally)
    dist := 0;
    FOR i IN 1..n LOOP
      diff := q_arr[i] - e_arr[i];
      dist := dist + diff * diff;
    END LOOP;
    dist := sqrt(dist);

    IF dist <= match_threshold THEN
      photo_id  := r.photo_id;
      similarity := 1.0 - (dist / (match_threshold + 0.001));
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_faces(text, float8, int, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.match_faces(text, float8, int, uuid) TO authenticated;
