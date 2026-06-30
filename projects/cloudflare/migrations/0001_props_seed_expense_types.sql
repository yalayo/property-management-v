-- =============================================================================
-- Seed German Nebenkosten expense types (matches actual cost/expense-types data)
-- =============================================================================
-- These are "system-level" expense types stored with organization-id = "system".
-- The handler returns them alongside each org's own types, so every new org
-- sees them immediately without manual entry. Users can still add their own.
-- This migration is idempotent: INSERT OR IGNORE prevents duplicate rows.
--
-- Keys here intentionally match the :cost/line and :expense-type/key values
-- already used in production data (e.g. "property-tax", "drinking-water",
-- "waste-water", "elevator-maintenance"), not the generic German-word keys
-- from the previous seed (e.g. "grundsteuer", "wasser", "aufzug").
-- =============================================================================

INSERT OR IGNORE INTO props_transactions (tx_meta)
VALUES ('{"seed":"expense-types-v1"}');

-- ── Entities ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO props_entities (entity_id, entity_type, created_tx) VALUES
  ('sys-et-property-tax',          'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-drinking-water',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-waste-water',           'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-rain-water',            'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-heating',               'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-elevator-maintenance',  'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-elevator-power',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-tuv-inspection',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-street-cleaning',       'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-waste-collection',      'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-building-cleaning',     'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-electricity',           'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-smoke-detector',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-insurance',             'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-emergency-phone',       'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}')),
  ('sys-et-emergency-service',     'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v1"}'));

-- ── Facts ─────────────────────────────────────────────────────────────────────
-- Values are JSON-encoded strings (double-quoted).
-- Distribution methods: "living-area" | "person" | "consumed"

INSERT OR IGNORE INTO props_facts (entity_id, attribute, value, tx_id, added) VALUES
  -- property-tax
  ('sys-et-property-tax', 'expense-type/organization-id',     '"system"',         (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-property-tax', 'expense-type/key',                 '"property-tax"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-property-tax', 'expense-type/name-en',             '"Property tax"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-property-tax', 'expense-type/name-de',             '"Grundsteuer"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-property-tax', 'expense-type/distribution-method', '"living-area"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- drinking-water
  ('sys-et-drinking-water', 'expense-type/organization-id',     '"system"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-drinking-water', 'expense-type/key',                 '"drinking-water"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-drinking-water', 'expense-type/name-en',             '"Drinking water"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-drinking-water', 'expense-type/name-de',             '"Trinkwasser"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-drinking-water', 'expense-type/distribution-method', '"living-area"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- waste-water
  ('sys-et-waste-water', 'expense-type/organization-id',     '"system"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-water', 'expense-type/key',                 '"waste-water"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-water', 'expense-type/name-en',             '"Waste water"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-water', 'expense-type/name-de',             '"Schmutzwasser"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-water', 'expense-type/distribution-method', '"living-area"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- rain-water
  ('sys-et-rain-water', 'expense-type/organization-id',     '"system"',              (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-rain-water', 'expense-type/key',                 '"rain-water"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-rain-water', 'expense-type/name-en',             '"Rain water"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-rain-water', 'expense-type/name-de',             '"Niederschlagswasser"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-rain-water', 'expense-type/distribution-method', '"living-area"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- heating
  ('sys-et-heating', 'expense-type/organization-id',     '"system"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-heating', 'expense-type/key',                 '"heating"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-heating', 'expense-type/name-en',             '"Heating"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-heating', 'expense-type/name-de',             '"Heizung"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-heating', 'expense-type/distribution-method', '"consumed"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- elevator-maintenance
  ('sys-et-elevator-maintenance', 'expense-type/organization-id',     '"system"',              (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-maintenance', 'expense-type/key',                 '"elevator-maintenance"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-maintenance', 'expense-type/name-en',             '"Elevator maintenance"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-maintenance', 'expense-type/name-de',             '"Aufzugswartung"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-maintenance', 'expense-type/distribution-method', '"living-area"',         (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- elevator-power
  ('sys-et-elevator-power', 'expense-type/organization-id',     '"system"',                (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-power', 'expense-type/key',                 '"elevator-power"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-power', 'expense-type/name-en',             '"Elevator power supply"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-power', 'expense-type/name-de',             '"Strom Aufzug"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-elevator-power', 'expense-type/distribution-method', '"living-area"',           (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- tuv-inspection
  ('sys-et-tuv-inspection', 'expense-type/organization-id',     '"system"',                    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-tuv-inspection', 'expense-type/key',                 '"tuv-inspection"',            (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-tuv-inspection', 'expense-type/name-en',             '"TÜV Elevator Inspection"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-tuv-inspection', 'expense-type/name-de',             '"TÜV Aufzug"',                (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-tuv-inspection', 'expense-type/distribution-method', '"living-area"',               (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- street-cleaning
  ('sys-et-street-cleaning', 'expense-type/organization-id',     '"system"',           (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-street-cleaning', 'expense-type/key',                 '"street-cleaning"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-street-cleaning', 'expense-type/name-en',             '"Street cleaning"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-street-cleaning', 'expense-type/name-de',             '"Straßenreinigung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-street-cleaning', 'expense-type/distribution-method', '"living-area"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- waste-collection
  ('sys-et-waste-collection', 'expense-type/organization-id',     '"system"',           (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-collection', 'expense-type/key',                 '"waste-collection"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-collection', 'expense-type/name-en',             '"Waste collection"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-collection', 'expense-type/name-de',             '"Müllabfuhr"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-waste-collection', 'expense-type/distribution-method', '"living-area"',      (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- building-cleaning
  ('sys-et-building-cleaning', 'expense-type/organization-id',     '"system"',             (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-building-cleaning', 'expense-type/key',                 '"building-cleaning"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-building-cleaning', 'expense-type/name-en',             '"Building cleaning"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-building-cleaning', 'expense-type/name-de',             '"Gebäudereinigung"',   (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-building-cleaning', 'expense-type/distribution-method', '"living-area"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- electricity
  ('sys-et-electricity', 'expense-type/organization-id',     '"system"',             (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-electricity', 'expense-type/key',                 '"electricity"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-electricity', 'expense-type/name-en',             '"General electricity"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-electricity', 'expense-type/name-de',             '"Allgemeinstrom"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-electricity', 'expense-type/distribution-method', '"living-area"',        (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- smoke-detector
  ('sys-et-smoke-detector', 'expense-type/organization-id',     '"system"',          (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-smoke-detector', 'expense-type/key',                 '"smoke-detector"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-smoke-detector', 'expense-type/name-en',             '"Smoke detector"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-smoke-detector', 'expense-type/name-de',             '"Rauchwarnmelder"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-smoke-detector', 'expense-type/distribution-method', '"living-area"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- insurance
  ('sys-et-insurance', 'expense-type/organization-id',     '"system"',       (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-insurance', 'expense-type/key',                 '"insurance"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-insurance', 'expense-type/name-en',             '"Insurance"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-insurance', 'expense-type/name-de',             '"Versicherung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-insurance', 'expense-type/distribution-method', '"living-area"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- emergency-phone
  ('sys-et-emergency-phone', 'expense-type/organization-id',     '"system"',         (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-phone', 'expense-type/key',                 '"emergency-phone"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-phone', 'expense-type/name-en',             '"Emergency phone"',(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-phone', 'expense-type/name-de',             '"Notruftelefon"',  (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-phone', 'expense-type/distribution-method', '"living-area"',    (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),

  -- emergency-service
  ('sys-et-emergency-service', 'expense-type/organization-id',     '"system"',                (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-service', 'expense-type/key',                 '"emergency-service"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-service', 'expense-type/name-en',             '"Emergency service"',     (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-service', 'expense-type/name-de',             '"Bereischaft Notdienst"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1),
  ('sys-et-emergency-service', 'expense-type/distribution-method', '"living-area"',           (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1);