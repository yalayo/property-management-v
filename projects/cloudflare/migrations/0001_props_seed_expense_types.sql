-- =============================================================================
-- Seed standard German Nebenkosten expense types (BetrKV §2)
-- =============================================================================
-- These are "system-level" expense types stored with organization-id = "system".
-- The handler returns them alongside each org's own types, so every new org
-- sees them immediately without manual entry.  Users can still add their own.
-- This migration is idempotent: INSERT OR IGNORE prevents duplicate rows.
-- =============================================================================

INSERT OR IGNORE INTO props_transactions (tx_meta)
VALUES ('{"seed":"expense-types-v1"}');

-- ── Entities ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO props_entities (entity_id, entity_type, created_tx) VALUES
  ('sys-et-grundsteuer',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-wasser',             'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-heizung',            'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-warmwasser',         'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-aufzug',             'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-strassenreinigung',  'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-muellabfuhr',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-gebaeudereinigung',  'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-gartenpflege',       'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-beleuchtung',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-schornsteinreinigung','expense-type',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-versicherungen',     'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-hausmeister',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-allgemeinstrom',     'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-sonstiges',          'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'));

-- ── Facts ─────────────────────────────────────────────────────────────────────
-- Values are JSON-encoded strings (double-quoted).
-- Distribution methods: "living-area" | "person" | "consumed"

INSERT OR IGNORE INTO props_facts (entity_id, attribute, value, tx_id, added) VALUES
  -- grundsteuer
  ('sys-et-grundsteuer', 'expense-type/organization-id',     '"system"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-grundsteuer', 'expense-type/key',                 '"grundsteuer"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-grundsteuer', 'expense-type/name-en',             '"Property tax"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-grundsteuer', 'expense-type/name-de',             '"Grundsteuer"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-grundsteuer', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- wasser
  ('sys-et-wasser', 'expense-type/organization-id',     '"system"',                    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-wasser', 'expense-type/key',                 '"wasser"',                    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-wasser', 'expense-type/name-en',             '"Water \/ wastewater"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-wasser', 'expense-type/name-de',             '"Wasser \/ Abwasser"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-wasser', 'expense-type/distribution-method', '"person"',                    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- heizung
  ('sys-et-heizung', 'expense-type/organization-id',     '"system"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-heizung', 'expense-type/key',                 '"heizung"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-heizung', 'expense-type/name-en',             '"Heating"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-heizung', 'expense-type/name-de',             '"Heizung"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-heizung', 'expense-type/distribution-method', '"consumed"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- warmwasser
  ('sys-et-warmwasser', 'expense-type/organization-id',     '"system"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-warmwasser', 'expense-type/key',                 '"warmwasser"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-warmwasser', 'expense-type/name-en',             '"Hot water"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-warmwasser', 'expense-type/name-de',             '"Warmwasser"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-warmwasser', 'expense-type/distribution-method', '"consumed"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- aufzug
  ('sys-et-aufzug', 'expense-type/organization-id',     '"system"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-aufzug', 'expense-type/key',                 '"aufzug"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-aufzug', 'expense-type/name-en',             '"Elevator"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-aufzug', 'expense-type/name-de',             '"Aufzug"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-aufzug', 'expense-type/distribution-method', '"living-area"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- strassenreinigung
  ('sys-et-strassenreinigung', 'expense-type/organization-id',     '"system"',                (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-strassenreinigung', 'expense-type/key',                 '"strassenreinigung"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-strassenreinigung', 'expense-type/name-en',             '"Street cleaning"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-strassenreinigung', 'expense-type/name-de',             '"Straßenreinigung"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-strassenreinigung', 'expense-type/distribution-method', '"living-area"',           (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- muellabfuhr
  ('sys-et-muellabfuhr', 'expense-type/organization-id',     '"system"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-muellabfuhr', 'expense-type/key',                 '"muellabfuhr"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-muellabfuhr', 'expense-type/name-en',             '"Waste disposal"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-muellabfuhr', 'expense-type/name-de',             '"Müllabfuhr"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-muellabfuhr', 'expense-type/distribution-method', '"living-area"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- gebaeudereinigung
  ('sys-et-gebaeudereinigung', 'expense-type/organization-id',     '"system"',                 (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gebaeudereinigung', 'expense-type/key',                 '"gebaeudereinigung"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gebaeudereinigung', 'expense-type/name-en',             '"Building cleaning"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gebaeudereinigung', 'expense-type/name-de',             '"Gebäudereinigung"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gebaeudereinigung', 'expense-type/distribution-method', '"living-area"',            (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- gartenpflege
  ('sys-et-gartenpflege', 'expense-type/organization-id',     '"system"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gartenpflege', 'expense-type/key',                 '"gartenpflege"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gartenpflege', 'expense-type/name-en',             '"Garden maintenance"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gartenpflege', 'expense-type/name-de',             '"Gartenpflege"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-gartenpflege', 'expense-type/distribution-method', '"living-area"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- beleuchtung
  ('sys-et-beleuchtung', 'expense-type/organization-id',     '"system"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-beleuchtung', 'expense-type/key',                 '"beleuchtung"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-beleuchtung', 'expense-type/name-en',             '"Common lighting"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-beleuchtung', 'expense-type/name-de',             '"Beleuchtung"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-beleuchtung', 'expense-type/distribution-method', '"living-area"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- schornsteinreinigung
  ('sys-et-schornsteinreinigung', 'expense-type/organization-id',     '"system"',                   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-schornsteinreinigung', 'expense-type/key',                 '"schornsteinreinigung"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-schornsteinreinigung', 'expense-type/name-en',             '"Chimney cleaning"',         (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-schornsteinreinigung', 'expense-type/name-de',             '"Schornsteinreinigung"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-schornsteinreinigung', 'expense-type/distribution-method', '"living-area"',              (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- versicherungen
  ('sys-et-versicherungen', 'expense-type/organization-id',     '"system"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-versicherungen', 'expense-type/key',                 '"versicherungen"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-versicherungen', 'expense-type/name-en',             '"Insurance"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-versicherungen', 'expense-type/name-de',             '"Versicherungen"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-versicherungen', 'expense-type/distribution-method', '"living-area"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- hausmeister
  ('sys-et-hausmeister', 'expense-type/organization-id',     '"system"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-hausmeister', 'expense-type/key',                 '"hausmeister"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-hausmeister', 'expense-type/name-en',             '"Caretaker"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-hausmeister', 'expense-type/name-de',             '"Hausmeister"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-hausmeister', 'expense-type/distribution-method', '"living-area"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- allgemeinstrom
  ('sys-et-allgemeinstrom', 'expense-type/organization-id',     '"system"',              (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-allgemeinstrom', 'expense-type/key',                 '"allgemeinstrom"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-allgemeinstrom', 'expense-type/name-en',             '"Common electricity"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-allgemeinstrom', 'expense-type/name-de',             '"Allgemeinstrom"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-allgemeinstrom', 'expense-type/distribution-method', '"living-area"',         (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),

  -- sonstiges
  ('sys-et-sonstiges', 'expense-type/organization-id',     '"system"',                    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-sonstiges', 'expense-type/key',                 '"sonstiges"',                 (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-sonstiges', 'expense-type/name-en',             '"Other operating costs"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-sonstiges', 'expense-type/name-de',             '"Sonstige Betriebskosten"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1),
  ('sys-et-sonstiges', 'expense-type/distribution-method', '"living-area"',               (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'), 1);
