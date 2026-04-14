-- ============================================================
-- WeddingQR — Yearly Plan Architecture Overhaul
-- Run this in Supabase SQL Editor (service role context)
-- ============================================================

-- ─── STEP 0: CLEAR ALL DATA ─────────────────────────────────
-- Delete all photos and face embeddings from DB
-- (R2 objects must be cleared separately via admin panel or bulk delete)
DELETE FROM face_embeddings;
DELETE FROM guest_selections;
DELETE FROM photos;
DELETE FROM events;

-- Drop old billing tables
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plan_configs CASCADE;
DROP TABLE IF EXISTS monthly_plan_configs CASCADE;

-- Remove old columns from events (if they exist)
ALTER TABLE events
  DROP COLUMN IF EXISTS purchase_id,
  DROP COLUMN IF EXISTS subscription_id,
  DROP COLUMN IF EXISTS photos_limit,
  DROP COLUMN IF EXISTS storage_gb;

-- ─── YEARLY PLAN CONFIGS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS yearly_plan_configs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key              text        NOT NULL UNIQUE,
  label            text        NOT NULL,
  amount_paise     bigint      NOT NULL DEFAULT 0,
  photos_limit     int         NOT NULL DEFAULT 5000,
  max_image_size_mb int        NOT NULL DEFAULT 20,
  duration_days    int         NOT NULL DEFAULT 365,
  tagline          text        NOT NULL DEFAULT '',
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO yearly_plan_configs (key, label, amount_paise, photos_limit, max_image_size_mb, duration_days, tagline, is_active)
VALUES
  ('starter', 'Starter',  200000,  5000, 20, 365, 'Perfect for intimate events',        true),
  ('pro',     'Pro',      350000, 10000, 30, 365, 'Ideal for full wedding coverage',     true),
  ('premium', 'Premium',  500000, 20000, 50, 365, 'Maximum capacity for large events',   true)
ON CONFLICT (key) DO NOTHING;

-- RLS: anyone can read, only service role can write
ALTER TABLE yearly_plan_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read yearly_plan_configs" ON yearly_plan_configs FOR SELECT USING (true);
CREATE POLICY "Service role manages yearly_plan_configs" ON yearly_plan_configs FOR ALL USING (auth.role() = 'service_role');

-- ─── USER PLANS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_plans (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key            text        NOT NULL,  -- 'free_trial' | 'starter' | 'pro' | 'premium'
  photos_limit        int         NOT NULL DEFAULT 100,
  max_image_size_mb   int         NOT NULL DEFAULT 10,
  duration_days       int         NOT NULL DEFAULT 30,
  amount_paise        bigint      NOT NULL DEFAULT 0,
  razorpay_order_id   text,
  razorpay_payment_id text,
  status              text        NOT NULL DEFAULT 'active',  -- 'active' | 'expired' | 'pending'
  start_date          timestamptz NOT NULL DEFAULT now(),
  end_date            timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan" ON user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages user_plans" ON user_plans FOR ALL USING (auth.role() = 'service_role');

-- ─── DB TRIGGER: AUTO FREE TRIAL ON SIGNUP ──────────────────
CREATE OR REPLACE FUNCTION grant_free_trial_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_plans (
    user_id, plan_key, photos_limit, max_image_size_mb,
    duration_days, amount_paise, status, start_date, end_date
  ) VALUES (
    NEW.id,
    'free_trial',
    100,
    10,
    30,
    0,
    'active',
    now(),
    now() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION grant_free_trial_on_signup();

-- ─── RPC: GET USER ACTIVE PLAN ──────────────────────────────
CREATE OR REPLACE FUNCTION get_user_active_plan(p_user_id uuid)
RETURNS TABLE (
  id                  uuid,
  plan_key            text,
  photos_limit        int,
  max_image_size_mb   int,
  duration_days       int,
  amount_paise        bigint,
  status              text,
  start_date          timestamptz,
  end_date            timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- First, mark any expired plans
  UPDATE user_plans
    SET status = 'expired'
    WHERE user_id = p_user_id
      AND status = 'active'
      AND end_date < now();

  -- Return the most recent active plan
  RETURN QUERY
    SELECT
      up.id, up.plan_key, up.photos_limit, up.max_image_size_mb,
      up.duration_days, up.amount_paise, up.status, up.start_date, up.end_date
    FROM user_plans up
    WHERE up.user_id = p_user_id
      AND up.status = 'active'
    ORDER BY up.created_at DESC
    LIMIT 1;
END;
$$;

-- ─── RPC: GET USER TOTAL PHOTO COUNT ───────────────────────
CREATE OR REPLACE FUNCTION get_user_photo_count(p_user_id uuid)
RETURNS int LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(COUNT(ph.id)::int, 0)
  FROM photos ph
  JOIN events ev ON ev.id = ph.event_id
  WHERE ev.user_id = p_user_id;
$$;

-- ─── RPC: ADMIN UPDATE YEARLY PLAN CONFIG ───────────────────
CREATE OR REPLACE FUNCTION admin_update_yearly_plan_config(
  p_key               text,
  p_label             text,
  p_amount_paise      bigint,
  p_photos_limit      int,
  p_max_image_size_mb int,
  p_duration_days     int,
  p_tagline           text,
  p_is_active         boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO yearly_plan_configs (key, label, amount_paise, photos_limit, max_image_size_mb, duration_days, tagline, is_active, updated_at)
  VALUES (p_key, p_label, p_amount_paise, p_photos_limit, p_max_image_size_mb, p_duration_days, p_tagline, p_is_active, now())
  ON CONFLICT (key) DO UPDATE SET
    label              = p_label,
    amount_paise       = p_amount_paise,
    photos_limit       = p_photos_limit,
    max_image_size_mb  = p_max_image_size_mb,
    duration_days      = p_duration_days,
    tagline            = p_tagline,
    is_active          = p_is_active,
    updated_at         = now();
END;
$$;

-- ─── RPC: ADMIN GET USERS (updated for user_plans) ──────────
-- (Overwrite the existing function to include plan info)
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id           uuid,
  email        text,
  full_name    text,
  studio_name  text,
  event_count  bigint,
  photo_count  bigint,
  plan_key     text,
  plan_status  text,
  created_at   timestamptz
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    u.id,
    u.email,
    (u.raw_user_meta_data->>'full_name')::text  AS full_name,
    (u.raw_user_meta_data->>'studio_name')::text AS studio_name,
    (SELECT COUNT(*) FROM events ev WHERE ev.user_id = u.id)         AS event_count,
    (SELECT get_user_photo_count(u.id))                               AS photo_count,
    (SELECT up.plan_key FROM user_plans up WHERE up.user_id = u.id ORDER BY up.created_at DESC LIMIT 1) AS plan_key,
    (SELECT up.status   FROM user_plans up WHERE up.user_id = u.id ORDER BY up.created_at DESC LIMIT 1) AS plan_status,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
$$;

-- Grant execute on RPC functions to anon/authenticated roles
GRANT EXECUTE ON FUNCTION get_user_active_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_photo_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_yearly_plan_config(text,text,bigint,int,int,int,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_users() TO authenticated;
