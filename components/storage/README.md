# storage

Append-only, fact-based storage with a Datahike-shaped API. All public functions return JavaScript Promises and work identically against both backends.

## Backends

| Integrant key | When to use |
|---|---|
| `::storage/d1` | Production — Cloudflare D1 SQLite binding |
| `::storage/memory` | Tests and local dev — in-process atom |

Values are JSON-encoded through `core/encode-value` / `core/decode-value` in both backends, so behaviour is identical including keyword handling (keywords stored as values become strings on read-back).

## Setup

```clojure
;; deps.edn — add to your project
{app.storage/storage {:local/root "../../components/storage"}}
```

```clojure
;; Integrant config — production
{:app.storage.interface/d1 {:db #cf/d1-binding "DB"}}

;; Integrant config — tests / dev
{:app.storage.interface/memory {:tx-data [...]}}   ; :tx-data is optional seed
```

Both init-keys return the same implementation map and register it in a module-level atom. After init, call public functions directly with no storage argument:

```clojure
(require '[app.storage.interface :as storage])

(storage/transact! [{:db/id "user-1" :db/type "user" :user/name "Alice"}])
```

## Database schema (D1 only)

The `::d1` backend expects these tables and views to exist. Run migrations before deploying.

**Tables**

```sql
CREATE TABLE transactions (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_time  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tx_meta  TEXT
);

CREATE TABLE entities (
  entity_id    TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  created_tx   INTEGER NOT NULL,
  retracted_tx INTEGER
);

CREATE TABLE facts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id   TEXT    NOT NULL,
  attribute   TEXT    NOT NULL,
  value       TEXT    NOT NULL,
  tx_id       INTEGER NOT NULL,
  added       INTEGER NOT NULL DEFAULT 1,   -- 1 = assert, 0 = retract
  excised_at  TEXT                          -- ISO timestamp when GDPR-excised
);

CREATE TABLE db_schema (
  ident        TEXT PRIMARY KEY,
  value_type   TEXT NOT NULL DEFAULT 'string',
  cardinality  TEXT NOT NULL DEFAULT 'one',
  doc          TEXT NOT NULL DEFAULT '',
  unique_val   INTEGER NOT NULL DEFAULT 0,
  is_component INTEGER NOT NULL DEFAULT 0,
  created_tx   INTEGER NOT NULL
);
```

**Views**

```sql
-- current_facts: latest non-excised, non-retracted fact per entity+attribute
CREATE VIEW current_facts AS
SELECT entity_id, attribute, value
FROM (
  SELECT entity_id, attribute, value, added,
         ROW_NUMBER() OVER (PARTITION BY entity_id, attribute ORDER BY tx_id DESC) AS rn
  FROM facts
  WHERE excised_at IS NULL
) ranked
WHERE rn = 1 AND added = 1;

-- fact_history: full audit log with transaction metadata
CREATE VIEW fact_history AS
SELECT f.entity_id, f.attribute, f.value, f.added,
       f.tx_id, t.tx_time, t.tx_meta
FROM facts f
JOIN transactions t ON t.id = f.tx_id
WHERE f.excised_at IS NULL;
```

## API reference

### Write

#### `transact!`

```clojure
(storage/transact! tx-data)
(storage/transact! tx-data tx-meta)
```

`tx-data` is a vector of datums in any of three forms:

```clojure
;; Map assertion — creates or extends entity
{:db/id "eid" :db/type "user" :user/name "Alice"}

;; Explicit assertion
[:db/add "eid" :user/email "alice@example.com"]

;; Retraction — records that the value no longer holds
[:db/retract "eid" :user/email "old@example.com"]
```

- `:db/id` is required on map datums if the entity already exists. Omit it only when creating a new entity; a UUID will be generated.
- `:db/type` sets the entity type used by `find-by-type`. Defaults to `"unknown"`.
- `[:db/add ...]` does **not** create an entity record — `find-by-type` will not find entities added only via this form.
- `tx-meta` is an optional map attached to the transaction for audit purposes.

Returns `Promise<{:tx-id n, :entity-ids [...]}>`.

#### `transact-schema!`

```clojure
(storage/transact-schema! attrs)
(storage/transact-schema! attrs tx-meta)
```

Registers attribute definitions. Each attr map may include:

| Key | Type | Default |
|---|---|---|
| `:ident` | keyword | required |
| `:value-type` | string | `"string"` |
| `:cardinality` | string | `"one"` |
| `:doc` | string | `""` |
| `:unique?` | boolean | `false` |
| `:component?` | boolean | `false` |

Schema registration is idempotent — existing idents are not overwritten.

Returns `Promise<{:tx-id n}>`.

#### `excise!`

```clojure
(storage/excise! eid)
(storage/excise! eid tx-meta)
```

GDPR right-to-forget. Permanently marks all facts for the entity as excised and sets `retracted-tx`. Unlike retraction, excision removes the values from `history` and `as-of` results. **Irreversible.**

Returns `Promise<{:success true}>`.

---

### Read

#### `entity`

```clojure
(storage/entity eid)   ; => Promise<entity-map>
```

Pull all current attributes. Equivalent to `(pull eid '*)`.

#### `pull`

```clojure
(storage/pull eid pattern)   ; => Promise<entity-map>
```

Pull an entity with a selective pattern.

```clojure
(storage/pull "user-1" [:user/name :user/email])
;; => {:db/id "user-1", :user/name "Alice", :user/email "alice@..."}

(storage/pull "user-1" '*)    ; all attributes
(storage/pull "user-1" ["*"]) ; same
```

#### `pull-many`

```clojure
(storage/pull-many eids pattern)   ; => Promise<[entity-map ...]>
```

Pull multiple entities with the same pattern. Implemented as parallel `pull` calls.

#### `lookup`

```clojure
(storage/lookup eid attr)   ; => Promise<value | nil>
```

Get the current value of a single attribute. Returns `nil` if the attribute is absent or was retracted.

---

### Query

#### `find-by-type`

```clojure
(storage/find-by-type entity-type)   ; => Promise<[eid ...]>
```

Returns all non-retracted entity IDs of the given type. Only entities created via map datums (with `:db/type`) appear here.

#### `find-by-attr`

```clojure
(storage/find-by-attr attr value)   ; => Promise<[eid ...]>
```

AVET index lookup. Returns entities where `attr` currently equals `value`.

#### `q`

```clojure
(storage/q {:where [[?e :attr val] ...]})   ; => Promise<#{eid ...}>
```

Intersects `find-by-attr` across all literal-value clauses. Returns entity IDs matching **all** clauses.

```clojure
(storage/q {:where [[?e :user/role "admin"]
                    [?e :user/active true]]})
```

**Limitations:** only supports literal-value clauses. Clauses with a symbol in the value position (e.g. `[?e :user/name ?name]`) are skipped. No joins, no variable bindings between clauses.

---

### Time-travel

#### `as-of`

```clojure
(storage/as-of eid tx-id)   ; => Promise<entity-map>
```

Entity state as it existed at the end of the given transaction. Excised facts are excluded.

#### `history`

```clojure
(storage/history eid)   ; => Promise<[datom ...]>
```

Full timeline of fact changes, ordered by `tx-id` ascending. Excised facts are excluded.

Each datom:

```clojure
{:db/id     "user-1"
 :attribute :user/name
 :value     "Alice"
 :added     true          ;; false = retraction
 :tx-id     42
 :tx-time   "2026-05-18T10:00:00.000Z"
 :tx-meta   {:op :signup}}
```

---

## Common patterns

**Create an entity and read it back**

```clojure
(-> (storage/transact! [{:db/id    "prop-1"
                          :db/type  "property"
                          :property/address "Main St 1"
                          :property/rent    1200}])
    (.then #(storage/entity "prop-1")))
```

**Update a single attribute**

```clojure
(storage/transact! [[:db/add "prop-1" :property/rent 1350]]
                   {:op :rent-increase :by "admin"})
```

**Find all entities of a type, then pull a subset of fields**

```clojure
(-> (storage/find-by-type "property")
    (.then #(storage/pull-many % [:property/address :property/rent])))
```

**Audit log for an entity**

```clojure
(.then (storage/history "prop-1")
       (fn [events]
         (doseq [{:keys [tx-time attribute value added]} events]
           (println tx-time (if added "+" "-") attribute value))))
```

**Point-in-time snapshot**

```clojure
;; What did prop-1 look like before transaction 10?
(storage/as-of "prop-1" 9)
```

**Schema-aware attribute registration**

```clojure
(storage/transact-schema!
  [{:ident :property/address :value-type "string" :doc "Street address"}
   {:ident :property/rent    :value-type "number"}
   {:ident :property/owner   :value-type "string" :unique? true}])
```
