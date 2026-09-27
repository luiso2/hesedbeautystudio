CREATE TABLE IF NOT EXISTS booking_requests (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  option_id TEXT,
  service_name TEXT NOT NULL,
  option_name TEXT,
  price_cents INTEGER,
  price_from INTEGER NOT NULL DEFAULT 0,
  requested_date TEXT NOT NULL,
  requested_time TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS booking_requests_created_at_idx
  ON booking_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS booking_requests_phone_created_idx
  ON booking_requests (customer_phone, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_confirmed_slot_idx
  ON booking_requests (requested_date, requested_time)
  WHERE status = 'confirmed';
