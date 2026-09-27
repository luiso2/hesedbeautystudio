ALTER TABLE booking_requests ADD COLUMN deposit_status TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (deposit_status IN ('unpaid', 'paid', 'refunded', 'waived'));
ALTER TABLE booking_requests ADD COLUMN deposit_paid_at TEXT;
