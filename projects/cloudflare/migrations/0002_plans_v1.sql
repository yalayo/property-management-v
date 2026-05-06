-- =============================================================================
-- props_plans — migrated to EAV(T) storage
-- =============================================================================
-- Run AFTER datahike_d1.sql (schema + bootstrap must already exist)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Register the attribute schema for the "plan" namespace
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "schema: props_plans attributes"}');

INSERT INTO db_schema (ident, value_type, cardinality, doc, unique_val, created_tx) VALUES
  ('plan/name',        'string',  'one',  'Display name of the plan',                     1, (SELECT MAX(tx_id) FROM transactions)),
  ('plan/price',       'string',  'one',  'Price as a string, e.g. "35" or "2700"',       0, (SELECT MAX(tx_id) FROM transactions)),
  ('plan/frequency',   'string',  'one',  'Billing frequency label, e.g. /mo',            0, (SELECT MAX(tx_id) FROM transactions)),
  ('plan/description', 'string',  'one',  'Short marketing description',                  0, (SELECT MAX(tx_id) FROM transactions)),
  ('plan/features',    'json',    'one',  'JSON array of feature strings',                0, (SELECT MAX(tx_id) FROM transactions)),
  ('plan/sortOrder',   'integer', 'one',  'Display sort order (ascending)',               0, (SELECT MAX(tx_id) FROM transactions)),
  ('plan/active',      'boolean', 'one',  '1 = visible/active, 0 = hidden/retired',       0, (SELECT MAX(tx_id) FROM transactions));


-- -----------------------------------------------------------------------------
-- 2. Register the entities (one per plan)
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "seed: props_plans entities"}');

INSERT INTO entities (entity_id, entity_type, created_tx) VALUES
  ('plan/done_for_you',   'plan', (SELECT MAX(tx_id) FROM transactions)),
  ('plan/done_with_you',  'plan', (SELECT MAX(tx_id) FROM transactions)),
  ('plan/done_by_you',    'plan', (SELECT MAX(tx_id) FROM transactions)),
  ('plan/crowdfunding',   'plan', (SELECT MAX(tx_id) FROM transactions));


-- -----------------------------------------------------------------------------
-- 3. Assert facts — Done for You
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "seed: plan/done_for_you facts"}');

INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES
  ('plan/done_for_you', 'plan/name',        '"Done for You"',                                                                          (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_for_you', 'plan/price',       '"35"',                                                                                    (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_for_you', 'plan/frequency',   '"/mo"',                                                                                   (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_for_you', 'plan/description', '"Perfect for landlords who want a fully managed solution."',                              (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_for_you', 'plan/features',    '["Full system access","Automated communications","Payment tracking","Regular updates"]',   (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_for_you', 'plan/sortOrder',   '1',                                                                                       (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_for_you', 'plan/active',      'true',                                                                                    (SELECT MAX(tx_id) FROM transactions), 1);


-- -----------------------------------------------------------------------------
-- 4. Assert facts — Done with You
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "seed: plan/done_with_you facts"}');

INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES
  ('plan/done_with_you', 'plan/name',        '"Done with You"',                                                                                                  (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_with_you', 'plan/price',       '"2700"',                                                                                                           (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_with_you', 'plan/frequency',   '"/one-time"',                                                                                                      (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_with_you', 'plan/description', '"Ideal for landlords who want initial setup assistance."',                                                         (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_with_you', 'plan/features',    '["Full system access","Personalized setup assistance","Data migration","Training sessions"]',                       (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_with_you', 'plan/sortOrder',   '2',                                                                                                                (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_with_you', 'plan/active',      'true',                                                                                                             (SELECT MAX(tx_id) FROM transactions), 1);


-- -----------------------------------------------------------------------------
-- 5. Assert facts — Done by You
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "seed: plan/done_by_you facts"}');

INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES
  ('plan/done_by_you', 'plan/name',        '"Done by You"',                                                                                           (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_by_you', 'plan/price',       '"950"',                                                                                                   (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_by_you', 'plan/frequency',   '"/installation"',                                                                                         (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_by_you', 'plan/description', '"For hands-on landlords who want full control."',                                                         (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_by_you', 'plan/features',    '["System installation","Basic configuration","Documentation","Pay-per-hour support"]',                     (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_by_you', 'plan/sortOrder',   '3',                                                                                                       (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/done_by_you', 'plan/active',      'true',                                                                                                    (SELECT MAX(tx_id) FROM transactions), 1);


-- -----------------------------------------------------------------------------
-- 6. Assert facts — Crowdfunding
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "seed: plan/crowdfunding facts"}');

INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES
  ('plan/crowdfunding', 'plan/name',        '"Support Our Development"',                                                                    (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/crowdfunding', 'plan/price',       '"370"',                                                                                        (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/crowdfunding', 'plan/frequency',   '"/one-time"',                                                                                  (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/crowdfunding', 'plan/description', '"Lifetime contribution — get lifetime access to all current and future features."',            (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/crowdfunding', 'plan/features',    '["Lifetime access","All current features","All future features"]',                             (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/crowdfunding', 'plan/sortOrder',   '4',                                                                                            (SELECT MAX(tx_id) FROM transactions), 1),
  ('plan/crowdfunding', 'plan/active',      'true',                                                                                         (SELECT MAX(tx_id) FROM transactions), 1);


-- =============================================================================
-- CONVENIENCE VIEW — reconstructs the original props_plans shape for queries
-- that don't need history (e.g. rendering a pricing page)
-- =============================================================================

CREATE VIEW IF NOT EXISTS v_plans AS
SELECT
  e.entity_id                                          AS id,
  MAX(CASE WHEN cf.attribute = 'plan/name'        THEN json_extract(cf.value, '$') END) AS name,
  MAX(CASE WHEN cf.attribute = 'plan/price'       THEN json_extract(cf.value, '$') END) AS price,
  MAX(CASE WHEN cf.attribute = 'plan/frequency'   THEN json_extract(cf.value, '$') END) AS frequency,
  MAX(CASE WHEN cf.attribute = 'plan/description' THEN json_extract(cf.value, '$') END) AS description,
  MAX(CASE WHEN cf.attribute = 'plan/features'    THEN cf.value                    END) AS features,  -- raw JSON array
  CAST(MAX(CASE WHEN cf.attribute = 'plan/sortOrder' THEN json_extract(cf.value, '$') END) AS INTEGER) AS sort_order,
  CAST(MAX(CASE WHEN cf.attribute = 'plan/active'    THEN json_extract(cf.value, '$') END) AS INTEGER) AS active
FROM entities e
JOIN current_facts cf ON cf.entity_id = e.entity_id
WHERE e.entity_type = 'plan'
  AND e.retracted_tx IS NULL
GROUP BY e.entity_id
ORDER BY sort_order ASC;


-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Render pricing page (drop-in replacement for SELECT * FROM props_plans):
-- SELECT * FROM v_plans WHERE active = 1;

-- Retire a plan (non-destructive — full history preserved):
--   INSERT INTO transactions (tx_meta) VALUES ('{"user":"admin","reason":"retire old plan"}');
--   INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES
--     ('plan/crowdfunding', 'plan/active', 'false', (SELECT MAX(tx_id) FROM transactions), 1);

-- Change a price (old price remains in history):
--   INSERT INTO transactions (tx_meta) VALUES ('{"user":"admin","reason":"price adjustment Q3"}');
--   INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES
--     ('plan/done_for_you', 'plan/price', '"45"', (SELECT MAX(tx_id) FROM transactions), 1);

-- Audit: who changed what and when?
--   SELECT f.entity_id, f.attribute, f.value, t.tx_time, t.tx_meta
--   FROM fact_history f
--   JOIN transactions t ON t.tx_id = f.tx_id
--   WHERE f.entity_id LIKE 'plan/%'
--   ORDER BY t.tx_time DESC;

-- Time-travel: what did the done_for_you plan look like at tx 5?
--   SELECT attribute, value
--   FROM (
--     SELECT attribute, value, added,
--            ROW_NUMBER() OVER (PARTITION BY attribute ORDER BY tx_id DESC) AS rn
--     FROM facts
--     WHERE entity_id = 'plan/done_for_you'
--       AND tx_id <= 5
--       AND excised_at IS NULL
--   ) ranked
--   WHERE rn = 1 AND added = 1;