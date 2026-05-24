-- ============================================================
-- Photography Studio Website — Database Schema
-- Run this in Supabase SQL Editor (or psql)
-- ============================================================

-- ── Helper: auto updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1. site_banners ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_banners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN ('desktop','mobile')),
  url           text NOT NULL,
  storage_path  text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_banners_updated_at
  BEFORE UPDATE ON site_banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE site_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_banners_public_select"
  ON site_banners FOR SELECT USING (true);

CREATE POLICY "site_banners_auth_all"
  ON site_banners FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 2. site_portfolios ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_portfolios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  cover_url           text,
  cover_storage_path  text,
  display_order       integer NOT NULL DEFAULT 0,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_portfolios_updated_at
  BEFORE UPDATE ON site_portfolios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE site_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_portfolios_public_select"
  ON site_portfolios FOR SELECT USING (true);

CREATE POLICY "site_portfolios_auth_all"
  ON site_portfolios FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 3. site_portfolio_photos ────────────────────────────────
CREATE TABLE IF NOT EXISTS site_portfolio_photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id   uuid NOT NULL REFERENCES site_portfolios(id) ON DELETE CASCADE,
  url            text NOT NULL,
  storage_path   text NOT NULL,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_portfolio_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_portfolio_photos_public_select"
  ON site_portfolio_photos FOR SELECT USING (true);

CREATE POLICY "site_portfolio_photos_auth_all"
  ON site_portfolio_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. site_gallery_photos ──────────────────────────────────
CREATE TABLE IF NOT EXISTS site_gallery_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url           text NOT NULL,
  storage_path  text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_gallery_photos_public_select"
  ON site_gallery_photos FOR SELECT USING (true);

CREATE POLICY "site_gallery_photos_auth_all"
  ON site_gallery_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 5. site_services ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_services_updated_at
  BEFORE UPDATE ON site_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE site_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_services_public_select"
  ON site_services FOR SELECT USING (true);

CREATE POLICY "site_services_auth_all"
  ON site_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 6. site_testimonials ────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_testimonials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initial       char(1) NOT NULL,
  name          text NOT NULL,
  review        text NOT NULL,
  stars         smallint NOT NULL DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  display_order integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_testimonials_updated_at
  BEFORE UPDATE ON site_testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE site_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_testimonials_public_select"
  ON site_testimonials FOR SELECT USING (true);

CREATE POLICY "site_testimonials_auth_all"
  ON site_testimonials FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 7. site_content ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section    text NOT NULL,
  key        text NOT NULL,
  value      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section, key)
);

CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content_public_select"
  ON site_content FOR SELECT USING (true);

CREATE POLICY "site_content_auth_all"
  ON site_content FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Default seed data
-- ============================================================

-- site_content: about
INSERT INTO site_content (section, key, value) VALUES
  ('about', 'title',         'WE CAPTURE THE MOMENTS'),
  ('about', 'description_1', 'At Film Factory Studios, we specialize in freezing those fleeting moments in time that hold immense significance for you. With our passion for photography and keen eye for detail, we transform ordinary moments into extraordinary memories.'),
  ('about', 'description_2', 'Whether it''s a milestone event, capturing precious child moments, or the breathtaking beauty of nature, we strive to encapsulate the essence of every moment.')
ON CONFLICT (section, key) DO NOTHING;

-- site_content: contact
INSERT INTO site_content (section, key, value) VALUES
  ('contact', 'address',  'V.P Theivam complex, 61/C, Tirupparankunram Rd, Vasanth Nagar, Madurai, Tamil Nadu 625003'),
  ('contact', 'phone',    '+91 95972 30737'),
  ('contact', 'email',    'filmfactorystudios23@gmail.com'),
  ('contact', 'whatsapp', '919597230737'),
  ('contact', 'maps_url', 'https://maps.app.goo.gl/KR8FtYPRa4eyB9ca6')
ON CONFLICT (section, key) DO NOTHING;

-- site_content: social
INSERT INTO site_content (section, key, value) VALUES
  ('social', 'facebook',  'https://www.facebook.com/p/Film-Factory-Studios-100092703673146/'),
  ('social', 'instagram', 'https://www.instagram.com/filmfactory_studios/')
ON CONFLICT (section, key) DO NOTHING;

-- site_content: footer
INSERT INTO site_content (section, key, value) VALUES
  ('footer', 'business_name', 'Film Factory Studios'),
  ('footer', 'stay_in_touch',  'Keep up-to-date with all things Film Factory Studios! Join our community and never miss a moment!'),
  ('footer', 'copyright',      'Copyright © 2025 Film Factory Studios. All rights reserved.')
ON CONFLICT (section, key) DO NOTHING;

-- site_services
INSERT INTO site_services (title, description, display_order) VALUES
  ('Portrait Sessions',  'Our portrait sessions are designed to showcase your personality and style in stunning imagery.',                                       1),
  ('Maternity Sessions', 'Embrace the beauty and miracle of new life with our maternity and newborn photography sessions.',                                      2),
  ('Wedding Sessions',   'Capture your special day with beautiful wedding photography that preserves every precious moment forever.',                            3)
ON CONFLICT DO NOTHING;

-- site_testimonials
INSERT INTO site_testimonials (initial, name, review, stars, display_order) VALUES
  ('M', 'Manish',        'A very good photographer. Both his videos and his working style were very good.',                   5, 1),
  ('V', 'Vinoth S',      'Film factory studios team has captured every wonderful moment of the day.',                         5, 2),
  ('S', 'Shalini Suresh','Best professional photography ever!!! Result was just wow!',                                        5, 3)
ON CONFLICT DO NOTHING;
