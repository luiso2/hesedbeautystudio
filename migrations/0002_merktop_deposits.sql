ALTER TABLE booking_requests ADD COLUMN merktop_link_id TEXT;
ALTER TABLE booking_requests ADD COLUMN merktop_deposit_id TEXT;
ALTER TABLE booking_requests ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_started'
  CHECK (payment_status IN ('not_started', 'awaiting_payment', 'paid', 'refunded', 'expired'));
ALTER TABLE booking_requests ADD COLUMN payment_event_at INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_merktop_deposit_idx
  ON booking_requests (merktop_deposit_id) WHERE merktop_deposit_id IS NOT NULL;
