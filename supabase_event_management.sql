-- Event Management Table
CREATE TABLE IF NOT EXISTS event_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Client Details
  client_name text NOT NULL DEFAULT '',
  bride_name text DEFAULT '',
  groom_name text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',

  -- Event Details
  event_type text DEFAULT 'wedding' CHECK (event_type IN ('wedding','engagement','birthday','reception','baby_shower')),
  event_date date,
  event_location text DEFAULT '',
  shoot_duration text DEFAULT '',

  -- Package Details
  package_name text DEFAULT '',
  package_price numeric(12,2) DEFAULT 0,
  services text[] DEFAULT '{}',
  promised_photos int DEFAULT 0,
  promised_video_duration text DEFAULT '',
  album_count int DEFAULT 0,

  -- Payment
  total_amount numeric(12,2) DEFAULT 0,
  advance_paid numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','upi','bank_transfer')),

  -- Delivery
  delivery_date date,
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending','editing','delivered')),

  -- Notes
  notes text DEFAULT '',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_management ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their own rows
CREATE POLICY "Users manage own event_management rows"
  ON event_management FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER trg_event_management_updated_at
  BEFORE UPDATE ON event_management
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
