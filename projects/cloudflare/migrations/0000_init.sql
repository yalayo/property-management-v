-- =============================================================================
-- Datahike-style EAV(T) Storage for Cloudflare D1 (SQLite)
-- =============================================================================
-- Philosophy:
--   - Data is a log of immutable FACTS, never updated or deleted in place
--   - Every fact = (Entity, Attribute, Value, Transaction, Added?)
--   - "Updating" = asserting a new fact  (added = 1)
--   - "Deleting" = retracting an old fact (added = 0)
--   - Full history and time-travel are first-class features
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TRANSACTIONS
--    Every write is grouped under a transaction.
--    tx_time is the wall-clock moment of the transaction.
--    tx_meta is an arbitrary JSON blob (user ID, IP, reason, etc.)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transactions (
  tx_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_time    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tx_meta    TEXT             -- JSON: { "user": "...", "reason": "..." }
);


-- -----------------------------------------------------------------------------
-- 2. FACTS  (the only table your application ever writes to)
--
--  entity_id  — stable identity of a "thing" (UUID string recommended)
--  attribute  — namespaced key, e.g. "user/name", "order/status"
--  value      — JSON-encoded scalar or nested value
--  tx_id      — which transaction asserted/retracted this fact
--  added      — 1 = assertion, 0 = retraction
--  excised_at — set by a GDPR/right-to-forget operation (soft physical delete)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id   TEXT    NOT NULL,
  attribute   TEXT    NOT NULL,
  value       TEXT    NOT NULL,   -- JSON encoded: "\"Alice\"", "42", "{...}"
  tx_id       INTEGER NOT NULL REFERENCES transactions(tx_id),
  added       INTEGER NOT NULL DEFAULT 1 CHECK (added IN (0, 1)),
  excised_at  TEXT    DEFAULT NULL   -- ISO-8601 timestamp if excised
);

-- -----------------------------------------------------------------------------
-- INDEXES — mirroring Datahike's EAVT, AEVT, AVET access patterns
-- -----------------------------------------------------------------------------

-- EAVT: "all attributes of entity X, ordered by time"
CREATE INDEX IF NOT EXISTS idx_eavt
  ON facts (entity_id, attribute, tx_id DESC)
  WHERE excised_at IS NULL;

-- AEVT: "all entities that have attribute A" (column-scan / analytics)
CREATE INDEX IF NOT EXISTS idx_aevt
  ON facts (attribute, entity_id, tx_id DESC)
  WHERE excised_at IS NULL;

-- AVET: "entities where attribute A has value V"
CREATE INDEX IF NOT EXISTS idx_avet
  ON facts (attribute, value, tx_id DESC)
  WHERE excised_at IS NULL;

-- Time-travel: filtering by tx_id range
CREATE INDEX IF NOT EXISTS idx_tx_id
  ON facts (tx_id);

-- For excision scans
CREATE INDEX IF NOT EXISTS idx_entity_excise
  ON facts (entity_id)
  WHERE excised_at IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 3. SCHEMA-AS-DATA
--    Attribute definitions are stored as facts, not DDL.
--    The special entity_id ':db' is the database's own identity namespace.
--    This mirrors Datahike's approach of making the schema introspectable.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS db_schema (
  attr_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ident        TEXT    NOT NULL UNIQUE,  -- e.g. "user/name"
  value_type   TEXT    NOT NULL,         -- "string" | "integer" | "float" | "boolean" | "uuid" | "instant" | "json"
  cardinality  TEXT    NOT NULL DEFAULT 'one' CHECK (cardinality IN ('one', 'many')),
  doc          TEXT,                     -- human-readable description
  unique_val   INTEGER NOT NULL DEFAULT 0 CHECK (unique_val IN (0, 1)),
  is_component INTEGER NOT NULL DEFAULT 0 CHECK (is_component IN (0, 1)),
  created_tx   INTEGER NOT NULL REFERENCES transactions(tx_id)
);

CREATE INDEX IF NOT EXISTS idx_schema_ident ON db_schema (ident);


-- -----------------------------------------------------------------------------
-- 4. ENTITY IDENTITY  (optional but recommended)
--    Tracks the "type" or namespace of each entity.
--    Equivalent to Datahike's :db/ident on entities.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS entities (
  entity_id   TEXT    PRIMARY KEY,
  entity_type TEXT    NOT NULL,   -- e.g. "user", "order", "product"
  created_tx  INTEGER NOT NULL REFERENCES transactions(tx_id),
  retracted_tx INTEGER DEFAULT NULL REFERENCES transactions(tx_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_type ON entities (entity_type);


-- =============================================================================
-- VIEWS  — convenient read-layer over the raw facts log
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V1: current_facts
--     The latest asserted (non-retracted, non-excised) value per (entity, attr)
-- -----------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS current_facts AS
SELECT
  f.entity_id,
  f.attribute,
  f.value,
  f.tx_id,
  t.tx_time
FROM facts f
JOIN transactions t ON t.tx_id = f.tx_id
WHERE f.added = 1
  AND f.excised_at IS NULL
  AND f.id = (
    -- Latest fact id for this (entity, attribute) pair
    SELECT id FROM facts f2
    WHERE f2.entity_id  = f.entity_id
      AND f2.attribute  = f.attribute
      AND f2.excised_at IS NULL
    ORDER BY f2.tx_id DESC
    LIMIT 1
  );


-- -----------------------------------------------------------------------------
-- V2: fact_history
--     Full timeline of every assertion and retraction for auditing
-- -----------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS fact_history AS
SELECT
  f.id,
  f.entity_id,
  f.attribute,
  f.value,
  f.added,
  f.tx_id,
  t.tx_time,
  t.tx_meta
FROM facts f
JOIN transactions t ON t.tx_id = f.tx_id
WHERE f.excised_at IS NULL
ORDER BY f.entity_id, f.attribute, f.tx_id ASC;


-- =============================================================================
-- STORED PROCEDURES (via D1 — expressed as SQL patterns for use in Workers)
-- =============================================================================
-- D1 does not support stored procedures, so these are documented as the
-- canonical SQL patterns your Worker should use.
--
-- PATTERN A — Begin a transaction and get its tx_id:
--
--   INSERT INTO transactions (tx_meta) VALUES (json('{"user":"u1"}'));
--   SELECT last_insert_rowid() AS tx_id;
--
-- PATTERN B — Assert a fact (upsert semantics via retract+assert):
--
--   INSERT INTO facts (entity_id, attribute, value, tx_id, added)
--   VALUES (?, ?, json(?), ?, 1);
--
-- PATTERN C — Retract a fact:
--
--   INSERT INTO facts (entity_id, attribute, value, tx_id, added)
--   VALUES (?, ?, json(?), ?, 0);
--
-- PATTERN D — Query current value of one attribute on one entity:
--
--   SELECT value FROM facts
--   WHERE entity_id = ?
--     AND attribute = ?
--     AND excised_at IS NULL
--   ORDER BY tx_id DESC
--   LIMIT 1;
--
-- PATTERN E — Time-travel: state of an entity as of a given tx_id
--
--   SELECT attribute, value
--   FROM (
--     SELECT attribute, value, added,
--            ROW_NUMBER() OVER (PARTITION BY attribute ORDER BY tx_id DESC) AS rn
--     FROM facts
--     WHERE entity_id   = ?
--       AND tx_id      <= ?          -- <-- your as_of tx_id
--       AND excised_at IS NULL
--   ) ranked
--   WHERE rn = 1 AND added = 1;
--
-- PATTERN F — All entities of a given type (e.g. all "user" entities):
--
--   SELECT entity_id FROM entities
--   WHERE entity_type = ?
--     AND retracted_tx IS NULL;
--
-- PATTERN G — Find entities by attribute value (AVET lookup):
--
--   SELECT DISTINCT f.entity_id
--   FROM facts f
--   WHERE f.attribute  = ?
--     AND f.value      = json(?)
--     AND f.excised_at IS NULL
--     AND f.added      = 1
--     AND f.tx_id = (
--       SELECT MAX(tx_id) FROM facts f2
--       WHERE f2.entity_id = f.entity_id
--         AND f2.attribute = f.attribute
--         AND f2.excised_at IS NULL
--     );
--
-- PATTERN H — GDPR excision (right to forget):
--
--   UPDATE facts
--   SET excised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
--   WHERE entity_id = ?;
--
--   UPDATE entities SET retracted_tx = ? WHERE entity_id = ?;
--
-- =============================================================================


-- =============================================================================
-- BOOTSTRAP: seed the schema with built-in system attributes
-- =============================================================================

-- System bootstrap transaction
INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "bootstrap"}');

-- Built-in attribute definitions
INSERT INTO db_schema (ident, value_type, cardinality, doc, created_tx) VALUES
  ('db/ident',       'string',  'one', 'Unique name/identity of an entity or attribute', (SELECT MAX(tx_id) FROM transactions));

INSERT INTO db_schema (ident, value_type, cardinality, doc, created_tx) VALUES
  ('db/type',        'string',  'one', 'The entity type namespace, e.g. user, order',    (SELECT MAX(tx_id) FROM transactions));

INSERT INTO db_schema (ident, value_type, cardinality, doc, created_tx) VALUES
  ('db/doc',         'string',  'one', 'Human-readable documentation string',            (SELECT MAX(tx_id) FROM transactions));

INSERT INTO db_schema (ident, value_type, cardinality, doc, created_tx) VALUES
  ('db/createdAt',   'instant', 'one', 'Wall-clock time the entity was first asserted',  (SELECT MAX(tx_id) FROM transactions));

INSERT INTO db_schema (ident, value_type, cardinality, doc, created_tx) VALUES
  ('db/retractedAt', 'instant', 'one', 'Wall-clock time the entity was retracted',       (SELECT MAX(tx_id) FROM transactions));

-- =============================================================================
-- EXAMPLE QUERIES (run these to verify the setup)
-- =============================================================================

-- Q1: Current state of all facts (latest values only)
-- SELECT * FROM current_facts ORDER BY entity_id, attribute;

-- Q2: Full history of Alice's name changes
-- SELECT entity_id, attribute, value, added, tx_id, tx_time
-- FROM fact_history
-- WHERE entity_id = 'ent-user-001' AND attribute = 'user/name';

-- Q3: All current users with their name and email
-- SELECT
--   n.entity_id,
--   n.value AS name,
--   e.value AS email
-- FROM current_facts n
-- JOIN current_facts e ON e.entity_id = n.entity_id AND e.attribute = 'user/email'
-- WHERE n.attribute = 'user/name';

-- Q4: Time-travel — state of user-001 as it was at tx_id = 2
-- SELECT attribute, value
-- FROM (
--   SELECT attribute, value, added,
--          ROW_NUMBER() OVER (PARTITION BY attribute ORDER BY tx_id DESC) AS rn
--   FROM facts
--   WHERE entity_id = 'ent-user-001'
--     AND tx_id <= 2
--     AND excised_at IS NULL
-- ) ranked
-- WHERE rn = 1 AND added = 1;

-- Q5: All admin users (AVET lookup)
-- SELECT DISTINCT f.entity_id
-- FROM facts f
-- WHERE f.attribute = 'user/role'
--   AND f.value = '"admin"'
--   AND f.excised_at IS NULL
--   AND f.added = 1
--   AND f.tx_id = (
--     SELECT MAX(tx_id) FROM facts f2
--     WHERE f2.entity_id = f.entity_id
--       AND f2.attribute = f.attribute
--       AND f2.excised_at IS NULL
--   );