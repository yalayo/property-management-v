CREATE TABLE settings (
  id TEXT PRIMARY KEY
    NOT NULL
    DEFAULT (lower(hex(randomblob(16)))),

  freetrial INTEGER
    NOT NULL
    DEFAULT 0,

  freetrialdays INTEGER
    NOT NULL
    DEFAULT 7,

  updated_at TEXT
    NOT NULL
    DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX settings_singleton ON settings ((1));