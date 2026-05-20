-- =============================================================================
-- billing + cost-line — EAV attribute schema
-- =============================================================================
-- Run AFTER 0000_init.sql (EAV bootstrap must already exist)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Register billing/* attributes
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "schema: billing attributes"}');

INSERT INTO db_schema (ident, value_type, cardinality, doc, unique_val, created_tx) VALUES
  ('billing/tenant-id',     'string',  'one', 'Reference to tenant entity ID',          1, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/last-name',     'string',  'one', 'Tenant last name',                       0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/street',        'string',  'one', 'Street address',                         0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/location',      'string',  'one', 'City and postal code',                   0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/prepayment',    'double',  'one', 'Annual prepayment amount in EUR',         0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/heating-costs', 'double',  'one', 'Heating costs in EUR',                   0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/total-costs',   'double',  'one', 'Derived total tenant cost share in EUR', 0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/total',         'double',  'one', 'Balance: positive = owed, negative = refund', 0, (SELECT MAX(tx_id) FROM transactions)),
  ('billing/refund',        'boolean', 'one', 'True when prepayment exceeded total costs', 0, (SELECT MAX(tx_id) FROM transactions));


-- -----------------------------------------------------------------------------
-- 2. Register cost-line/* attributes
-- -----------------------------------------------------------------------------

INSERT INTO transactions (tx_meta)
VALUES ('{"system": true, "reason": "schema: cost-line attributes"}');

INSERT INTO db_schema (ident, value_type, cardinality, doc, unique_val, created_tx) VALUES
  ('cost-line/billing-id', 'string',  'one', 'Parent billing entity ID',                    0, (SELECT MAX(tx_id) FROM transactions)),
  ('cost-line/name',       'string',  'one', 'Cost item label (Abrechnungsposten)',          0, (SELECT MAX(tx_id) FROM transactions)),
  ('cost-line/total',      'double',  'one', 'Total building-wide cost in EUR',              0, (SELECT MAX(tx_id) FROM transactions)),
  ('cost-line/pct',        'double',  'one', 'Allocation percentage (0-100)',                0, (SELECT MAX(tx_id) FROM transactions)),
  ('cost-line/key',        'string',  'one', 'Allocation key label (e.g. "Whfl.")',          0, (SELECT MAX(tx_id) FROM transactions)),
  ('cost-line/sqm-pct',    'double',  'one', 'Tenant sqm share as percentage (0-100)',       0, (SELECT MAX(tx_id) FROM transactions)),
  ('cost-line/share',      'double',  'one', 'Derived tenant cost share in EUR',             0, (SELECT MAX(tx_id) FROM transactions));
