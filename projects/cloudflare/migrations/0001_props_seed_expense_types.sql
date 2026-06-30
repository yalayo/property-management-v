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
--
-- IMPORTANT #1: every INSERT below — the transaction row, the entities, and
-- the facts — must reference the SAME tx_meta tag ('expense-types-v2') so
-- that `(SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '...')`
-- resolves to the same, real tx_id everywhere. A previous version of this
-- migration tagged the transaction/entities as "v1" but the facts as "v2",
-- so the facts subqueries returned NULL and every fact insert violated the
-- NOT NULL tx_id constraint on props_facts — entities were created but no
-- expense-type facts ever landed. Fixed here by using one tag consistently.
--
-- IMPORTANT #2: props_transactions has no UNIQUE constraint on tx_meta, so a
-- bare `INSERT OR IGNORE ... VALUES (...)` would insert a brand-new
-- transaction row (and therefore a new tx_id) every time this migration is
-- re-run, even though the entity/fact INSERT OR IGNORE calls below correctly
-- no-op on their primary keys. That breaks idempotency: a second run would
-- duplicate every fact under the new tx_id. We guard the transaction insert
-- with `WHERE NOT EXISTS` so it only ever happens once per tag.
--
-- IMPORTANT #3: The facts INSERT is split into one statement per expense type
-- (5 UNION ALL terms each) to stay within D1's compound-SELECT term limit.
-- =============================================================================

INSERT INTO props_transactions (tx_meta)
SELECT '{"seed":"expense-types-v2"}'
WHERE NOT EXISTS (
  SELECT 1 FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'
);

-- ── Entities ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO props_entities (entity_id, entity_type, created_tx) VALUES
  ('sys-et-property-tax',          'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-drinking-water',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-waste-water',           'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-rain-water',            'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-heating',               'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-elevator-maintenance',  'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-elevator-power',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-tuv-inspection',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-street-cleaning',       'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-waste-collection',      'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-building-cleaning',     'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-electricity',           'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-smoke-detector',        'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-insurance',             'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-emergency-phone',       'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}')),
  ('sys-et-emergency-service',     'expense-type', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'));

-- ── Facts ─────────────────────────────────────────────────────────────────────
-- Values are JSON-encoded strings (double-quoted).
-- Distribution methods: "living-area" | "person" | "consumed"
-- Split into one INSERT per expense type to stay within D1's compound-SELECT limit.

-- property-tax
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-property-tax', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-property-tax' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-property-tax', 'expense-type/key', '"property-tax"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-property-tax' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-property-tax', 'expense-type/name-en', '"Property tax"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-property-tax' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-property-tax', 'expense-type/name-de', '"Grundsteuer"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-property-tax' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-property-tax', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-property-tax' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- drinking-water
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-drinking-water', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-drinking-water' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-drinking-water', 'expense-type/key', '"drinking-water"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-drinking-water' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-drinking-water', 'expense-type/name-en', '"Drinking water"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-drinking-water' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-drinking-water', 'expense-type/name-de', '"Trinkwasser"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-drinking-water' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-drinking-water', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-drinking-water' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- waste-water
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-waste-water', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-water' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-water', 'expense-type/key', '"waste-water"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-water' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-water', 'expense-type/name-en', '"Waste water"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-water' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-water', 'expense-type/name-de', '"Schmutzwasser"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-water' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-water', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-water' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- rain-water
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-rain-water', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-rain-water' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-rain-water', 'expense-type/key', '"rain-water"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-rain-water' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-rain-water', 'expense-type/name-en', '"Rain water"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-rain-water' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-rain-water', 'expense-type/name-de', '"Niederschlagswasser"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-rain-water' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-rain-water', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-rain-water' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- heating
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-heating', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-heating' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-heating', 'expense-type/key', '"heating"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-heating' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-heating', 'expense-type/name-en', '"Heating"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-heating' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-heating', 'expense-type/name-de', '"Heizung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-heating' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-heating', 'expense-type/distribution-method', '"consumed"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-heating' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- elevator-maintenance
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-elevator-maintenance', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-maintenance' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-maintenance', 'expense-type/key', '"elevator-maintenance"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-maintenance' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-maintenance', 'expense-type/name-en', '"Elevator maintenance"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-maintenance' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-maintenance', 'expense-type/name-de', '"Aufzugswartung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-maintenance' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-maintenance', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-maintenance' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- elevator-power
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-elevator-power', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-power' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-power', 'expense-type/key', '"elevator-power"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-power' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-power', 'expense-type/name-en', '"Elevator power supply"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-power' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-power', 'expense-type/name-de', '"Strom Aufzug"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-power' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-elevator-power', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-elevator-power' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- tuv-inspection
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-tuv-inspection', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-tuv-inspection' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-tuv-inspection', 'expense-type/key', '"tuv-inspection"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-tuv-inspection' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-tuv-inspection', 'expense-type/name-en', '"TÜV Elevator Inspection"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-tuv-inspection' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-tuv-inspection', 'expense-type/name-de', '"TÜV Aufzug"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-tuv-inspection' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-tuv-inspection', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-tuv-inspection' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- street-cleaning
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-street-cleaning', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-street-cleaning' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-street-cleaning', 'expense-type/key', '"street-cleaning"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-street-cleaning' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-street-cleaning', 'expense-type/name-en', '"Street cleaning"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-street-cleaning' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-street-cleaning', 'expense-type/name-de', '"Straßenreinigung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-street-cleaning' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-street-cleaning', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-street-cleaning' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- waste-collection
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-waste-collection', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-collection' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-collection', 'expense-type/key', '"waste-collection"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-collection' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-collection', 'expense-type/name-en', '"Waste collection"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-collection' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-collection', 'expense-type/name-de', '"Müllabfuhr"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-collection' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-waste-collection', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-waste-collection' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- building-cleaning
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-building-cleaning', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-building-cleaning' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-building-cleaning', 'expense-type/key', '"building-cleaning"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-building-cleaning' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-building-cleaning', 'expense-type/name-en', '"Building cleaning"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-building-cleaning' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-building-cleaning', 'expense-type/name-de', '"Gebäudereinigung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-building-cleaning' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-building-cleaning', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-building-cleaning' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- electricity
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-electricity', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-electricity' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-electricity', 'expense-type/key', '"electricity"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-electricity' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-electricity', 'expense-type/name-en', '"General electricity"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-electricity' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-electricity', 'expense-type/name-de', '"Allgemeinstrom"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-electricity' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-electricity', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-electricity' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- smoke-detector
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-smoke-detector', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-smoke-detector' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-smoke-detector', 'expense-type/key', '"smoke-detector"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-smoke-detector' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-smoke-detector', 'expense-type/name-en', '"Smoke detector"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-smoke-detector' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-smoke-detector', 'expense-type/name-de', '"Rauchwarnmelder"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-smoke-detector' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-smoke-detector', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-smoke-detector' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- insurance
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-insurance', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-insurance' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-insurance', 'expense-type/key', '"insurance"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-insurance' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-insurance', 'expense-type/name-en', '"Insurance"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-insurance' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-insurance', 'expense-type/name-de', '"Versicherung"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-insurance' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-insurance', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-insurance' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- emergency-phone
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-emergency-phone', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-phone' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-phone', 'expense-type/key', '"emergency-phone"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-phone' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-phone', 'expense-type/name-en', '"Emergency phone"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-phone' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-phone', 'expense-type/name-de', '"Notruftelefon"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-phone' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-phone', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-phone' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);

-- emergency-service
INSERT INTO props_facts (entity_id, attribute, value, tx_id, added)
SELECT 'sys-et-emergency-service', 'expense-type/organization-id', '"system"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-service' AND attribute = 'expense-type/organization-id' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-service', 'expense-type/key', '"emergency-service"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-service' AND attribute = 'expense-type/key' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-service', 'expense-type/name-en', '"Emergency service"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-service' AND attribute = 'expense-type/name-en' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-service', 'expense-type/name-de', '"Bereischaft Notdienst"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-service' AND attribute = 'expense-type/name-de' AND excised_at IS NULL)
UNION ALL
SELECT 'sys-et-emergency-service', 'expense-type/distribution-method', '"living-area"', (SELECT MAX(tx_id) FROM props_transactions WHERE tx_meta = '{"seed":"expense-types-v2"}'), 1
  WHERE NOT EXISTS (SELECT 1 FROM props_facts WHERE entity_id = 'sys-et-emergency-service' AND attribute = 'expense-type/distribution-method' AND excised_at IS NULL);
