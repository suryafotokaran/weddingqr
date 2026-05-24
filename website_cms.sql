-- ============================================================
-- WEBSITE CMS — Supabase SQL
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. General content (about, contact, footer, social, business) ──
CREATE TABLE IF NOT EXISTS website_content (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  section     TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  value       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (section, key)
);

-- ── 2. Services ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_services (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  display_order INTEGER     DEFAULT 0,
  active        BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Testimonials ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_testimonials (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  initial       CHAR(1)     NOT NULL,
  name          TEXT        NOT NULL,
  review        TEXT        NOT NULL,
  stars         INTEGER     DEFAULT 5 CHECK (stars BETWEEN 1 AND 5),
  display_order INTEGER     DEFAULT 0,
  active        BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_website_content_updated_at
  BEFORE UPDATE ON website_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_website_services_updated_at
  BEFORE UPDATE ON website_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_website_testimonials_updated_at
  BEFORE UPDATE ON website_testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE website_content      ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_testimonials ENABLE ROW LEVEL SECURITY;

-- Public website can READ all
CREATE POLICY "public_read_content"
  ON website_content FOR SELECT USING (true);

CREATE POLICY "public_read_services"
  ON website_services FOR SELECT USING (true);

CREATE POLICY "public_read_testimonials"
  ON website_testimonials FOR SELECT USING (true);

-- Only signed-in admin can INSERT / UPDATE / DELETE
CREATE POLICY "auth_write_content"
  ON website_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_write_services"
  ON website_services FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth_write_testimonials"
  ON website_testimonials FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- About section
INSERT INTO website_content (section, key, value) VALUES
  ('about', 'title',         'WE CAPTURE THE MOMENTS'),
  ('about', 'description_1', 'At Capturer, we specialize in freezing those fleeting moments in time that hold immense significance for you. With our passion for photography and keen eye for detail, we transform ordinary moments into extraordinary memories.'),
  ('about', 'description_2', 'Whether it''s a milestone event, capturing precious child moments, or the breathtaking beauty of nature, we strive to encapsulate the essence of every moment.')
ON CONFLICT (section, key) DO NOTHING;

-- Contact section
INSERT INTO website_content (section, key, value) VALUES
  ('contact', 'address',  'V.P Theivam complex, 61/C, Tirupparankunram Rd, Vasanth Nagar, Madurai, Tamil Nadu 625003'),
  ('contact', 'phone',    '+91 95972 30737'),
  ('contact', 'email',    'filmfactorystudios23@gmail.com'),
  ('contact', 'whatsapp', '919597230737'),
  ('contact', 'maps_url', 'https://maps.app.goo.gl/KR8FtYPRa4eyB9ca6')
ON CONFLICT (section, key) DO NOTHING;

-- Social links
INSERT INTO website_content (section, key, value) VALUES
  ('social', 'facebook',  'https://www.facebook.com/p/Film-Factory-Studios-100092703673146/'),
  ('social', 'instagram', 'https://www.instagram.com/filmfactory_studios/')
ON CONFLICT (section, key) DO NOTHING;

-- Footer
INSERT INTO website_content (section, key, value) VALUES
  ('footer', 'business_name', 'Film Factory Studios'),
  ('footer', 'stay_in_touch', 'Keep up-to-date with all things Capturer! Join our community and never miss a moment!'),
  ('footer', 'copyright',     'Copyright © 2025 Film Factory Studios. All rights reserved.')
ON CONFLICT (section, key) DO NOTHING;

-- Business info
INSERT INTO website_content (section, key, value) VALUES
  ('business', 'name',    'Film Factory Studios'),
  ('business', 'tagline', 'Capturing Moments, Creating Memories')
ON CONFLICT (section, key) DO NOTHING;

-- Services
INSERT INTO website_services (title, description, display_order) VALUES
  ('Portrait Sessions',  'Our portrait sessions are designed to showcase your personality and style in stunning imagery.',                                          1),
  ('Maternity Sessions', 'Embrace the beauty and miracle of new life with our maternity and newborn photography sessions.',                                        2),
  ('Wedding Sessions',   'Capture your special day with beautiful wedding photography that preserves every precious moment forever.',                              3)
ON CONFLICT DO NOTHING;

-- Testimonials
INSERT INTO website_testimonials (initial, name, review, stars, display_order) VALUES
  ('M', 'Manish',
   'A very good photographer. I have never seen a photographer as elegant as him. Both his videos and his working style were very good. I was so happy when all my personal relationships were captured so beautifully and realistically in an album at my wedding.',
   5, 1),
  ('V', 'Vinoth S',
   'Film factory studios team has captured every wonderful moment of the day and was very discrete and professional. His photographs are beautiful and service is outstanding and we will be recommending him to everyone who we know getting married.',
   5, 2),
  ('R', 'Raja Pandiyan',
   'Very Good team, Got most beautiful pictures for both outdoor and marriage. Friends and relatives are enquiring for their functions after seeing their work. Definitely recommendable...best candid wedding photography in madurai.',
   5, 3),
  ('P', 'Priyanka Gj',
   'We had an astonishing experience with the film factory studios photography Madurai team; we hired them for my brother wedding and engagement celebration. They understood our requirements and delivered way much more than we expected.',
   5, 4),
  ('S', 'Shalini Suresh',
   'Best professional photography ever!!! Result was just wow! Especially Candid photography work was outstanding.',
   5, 5),
  ('T', 'Thiru',
   'Great excellent memories, nice experience and awesome photoshoot. A.R.Sabarieswaran brother excellent photographer, wonderful nit shoots, creating unforgettable memories in his photoshoot, amazing album works.',
   5, 6),
  ('A', 'Ajith Kumar',
   'Hopefully amazing work even more Creativity along with Candid. The Best photography in Madurai.',
   5, 7)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CHECK: photo_images column names (run to verify FK column name)
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'photo_images'
ORDER BY ordinal_position;
