-- ============================================
--  SUBSCRIPTIONS TABLE
-- ============================================

DROP TABLE IF EXISTS subscriptions;

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY
    NOT NULL
    DEFAULT (lower(hex(randomblob(16)))),

  user_id TEXT
    NOT NULL,

  plan_id TEXT
    NOT NULL,

  status TEXT
    NOT NULL
    DEFAULT 'pending_payment',

  days_used INTEGER
    NOT NULL
    DEFAULT 0,

  started_at TEXT,             -- null until payment confirmed
  paused_at TEXT,
  resumed_at TEXT,
  cancelled_at TEXT,
  last_renewal_at TEXT,
  payment_confirmed_at TEXT,

  sepa_reference TEXT UNIQUE,  -- unique SEPA payment reference

  is_trial INTEGER
    NOT NULL
    DEFAULT 0,

  trial_ends_at TEXT,

  FOREIGN KEY (user_id) REFERENCES accounts(user_id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Helpful indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
