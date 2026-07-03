CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE available_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_available_slots_date ON available_slots(date);
CREATE INDEX idx_available_slots_booked ON available_slots(is_booked);

CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES available_slots(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  activity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rsvps_slot_id ON rsvps(slot_id);

ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view free slots"
  ON available_slots FOR SELECT
  USING (is_booked = false);

CREATE POLICY "Anyone can view rsvps"
  ON rsvps FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create rsvps"
  ON rsvps FOR INSERT
  WITH CHECK (true);
