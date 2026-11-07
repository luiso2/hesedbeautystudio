ALTER TABLE booking_requests ADD COLUMN items_json TEXT;
ALTER TABLE booking_requests ADD COLUMN deposit_cents INTEGER NOT NULL DEFAULT 4000;
ALTER TABLE booking_requests ADD COLUMN payment_total_cents INTEGER;
ALTER TABLE booking_requests ADD COLUMN completed_at TEXT;
CREATE TABLE customer_reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES booking_requests(id),
  display_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX reviews_public ON customer_reviews(status, created_at);
