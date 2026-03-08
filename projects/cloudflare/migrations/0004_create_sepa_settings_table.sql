-- ============================================
--  SEPA SETTINGS (SINGLETON)
-- ============================================

DROP TABLE IF EXISTS sepa_settings;

CREATE TABLE sepa_settings (
  id TEXT PRIMARY KEY
    NOT NULL
    DEFAULT (lower(hex(randomblob(16)))),

  iban TEXT
    NOT NULL,

  bic TEXT
    NOT NULL,

  account_holder TEXT
    NOT NULL,

  bank_name TEXT
    NOT NULL,

  updated_at TEXT
    NOT NULL
    DEFAULT CURRENT_TIMESTAMP
);

-- Enforce singleton (only one row allowed)
CREATE UNIQUE INDEX sepa_settings_singleton
ON sepa_settings ((1));