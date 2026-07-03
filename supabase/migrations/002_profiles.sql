CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE available_slots ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE rsvps ADD COLUMN profile_id UUID REFERENCES profiles(id);

CREATE INDEX idx_available_slots_profile ON available_slots(profile_id);
CREATE INDEX idx_rsvps_profile ON rsvps(profile_id);
CREATE INDEX idx_profiles_username ON profiles(username);
