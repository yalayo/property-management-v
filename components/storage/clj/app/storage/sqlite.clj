(ns app.storage.sqlite
  "JVM-side EAV storage backend for the desktop app — a local SQLite file.

  Mirrors app.storage.eav (the D1/Cloudflare backend) pattern-by-pattern: same
  DDL, same SQL text. D1 *is* SQLite, so this is a driver swap
  (.prepare/.bind/.run/.all/.batch -> next.jdbc), not a redesign. Every fn takes
  a next.jdbc connectable as its first argument (mirrors eav.cljs's `db` arg) and
  returns plain Clojure values synchronously — no promises needed on the JVM.
  Single-tenant: unlike the D1 backend there is no `prefix`/multi-org table
  sharing, since each desktop install has its own local file for one org."
  (:require [clojure.set :as set]
            [clojure.string :as str]
            [next.jdbc :as jdbc]
            [next.jdbc.result-set :as rs]
            [app.storage.core :as core]))

;; ---------------------------------------------------------------------------
;; Schema — identical shape to components/storage/README.md's D1 DDL, plus one
;; local-only bookkeeping table (sync_meta) that has no server-side counterpart.
;; ---------------------------------------------------------------------------

(def ^:private ddl
  ["CREATE TABLE IF NOT EXISTS transactions (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_time  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      tx_meta  TEXT
    )"
   "CREATE TABLE IF NOT EXISTS entities (
      entity_id    TEXT PRIMARY KEY,
      entity_type  TEXT NOT NULL,
      created_tx   INTEGER NOT NULL,
      retracted_tx INTEGER
    )"
   "CREATE TABLE IF NOT EXISTS facts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id   TEXT    NOT NULL,
      attribute   TEXT    NOT NULL,
      value       TEXT    NOT NULL,
      tx_id       INTEGER NOT NULL,
      added       INTEGER NOT NULL DEFAULT 1,
      excised_at  TEXT
    )"
   "CREATE TABLE IF NOT EXISTS db_schema (
      ident        TEXT PRIMARY KEY,
      value_type   TEXT NOT NULL DEFAULT 'string',
      cardinality  TEXT NOT NULL DEFAULT 'one',
      doc          TEXT NOT NULL DEFAULT '',
      unique_val   INTEGER NOT NULL DEFAULT 0,
      is_component INTEGER NOT NULL DEFAULT 0,
      created_tx   INTEGER NOT NULL
    )"
   "CREATE VIEW IF NOT EXISTS current_facts AS
    SELECT entity_id, attribute, value
    FROM (
      SELECT entity_id, attribute, value, added,
             ROW_NUMBER() OVER (PARTITION BY entity_id, attribute ORDER BY tx_id DESC) AS rn
      FROM facts
      WHERE excised_at IS NULL
    ) ranked
    WHERE rn = 1 AND added = 1"
   "CREATE VIEW IF NOT EXISTS fact_history AS
    SELECT f.entity_id, f.attribute, f.value, f.added,
           f.tx_id, t.tx_time, t.tx_meta
    FROM facts f
    JOIN transactions t ON t.id = f.tx_id
    WHERE f.excised_at IS NULL"
   ;; local-only sync watermark + session — never synced, never part of the D1 schema
   "CREATE TABLE IF NOT EXISTS sync_meta (
      id                        INTEGER PRIMARY KEY CHECK (id = 1),
      last_pushed_tx_id         INTEGER NOT NULL DEFAULT 0,
      last_pulled_server_tx_id  INTEGER NOT NULL DEFAULT 0,
      jwt                       TEXT,
      org_id                    TEXT,
      user_email                TEXT
    )"
   "INSERT OR IGNORE INTO sync_meta (id, last_pushed_tx_id, last_pulled_server_tx_id)
    VALUES (1, 0, 0)"])

(defn open!
  "Opens (creating if needed) the SQLite file at db-path and runs the DDL.
  Returns a single long-lived java.sql.Connection to be threaded through every
  other fn in this namespace — a desktop app is single-user/mostly-serial, so
  one connection (rather than a pool) keeps last_insert_rowid() semantics simple."
  [db-path]
  (let [conn (jdbc/get-connection {:dbtype "sqlite" :dbname db-path})]
    (doseq [stmt ddl] (jdbc/execute! conn [stmt]))
    conn))

(defn close! [conn]
  (.close conn))

;; ---------------------------------------------------------------------------
;; Internal helpers
;; ---------------------------------------------------------------------------

(def ^:private opts {:builder-fn rs/as-unqualified-lower-maps})

(defn- q1 [conn sql-params]
  (jdbc/execute-one! conn sql-params opts))

(defn- q* [conn sql-params]
  (jdbc/execute! conn sql-params opts))

;; ---------------------------------------------------------------------------
;; PATTERN A — open a transaction, return its tx-id via last_insert_rowid()
;; ---------------------------------------------------------------------------

(defn- begin-tx! [conn tx-meta]
  (jdbc/execute! conn ["INSERT INTO transactions (tx_meta) VALUES (?)" (core/encode-value (or tx-meta {}))])
  (:id (q1 conn ["SELECT last_insert_rowid() AS id"])))

;; ---------------------------------------------------------------------------
;; transact! — orchestrates begin-tx! + per-datum inserts into one atomic write.
;; tx-data accepts the same three datum forms as eav.cljs (Datahike-shaped):
;;   {:db/id "eid" :db/type "user" :user/name "Alice"}  — map assertion
;;   [:db/add    "eid" :attr val]                        — explicit assert
;;   [:db/retract "eid" :attr val]                        — retraction
;; Returns {:tx-id n, :entity-ids [...]}
;; ---------------------------------------------------------------------------

(defn- assert-fact! [conn eid attr val tx-id added]
  (jdbc/execute! conn
                 ["INSERT INTO facts (entity_id, attribute, value, tx_id, added) VALUES (?, ?, json(?), ?, ?)"
                  eid (core/attr->sql attr) (core/encode-value val) tx-id added]))

(defn transact!
  ([conn tx-data] (transact! conn tx-data nil))
  ([conn tx-data tx-meta]
   (jdbc/with-transaction [tx conn]
     (let [tx-id      (begin-tx! tx tx-meta)
           entity-ids (volatile! #{})]
       (doseq [datum tx-data]
         (cond
           (map? datum)
           (let [eid   (or (:db/id datum) (str (random-uuid)))
                 etype (or (some-> (:db/type datum) name) "unknown")
                 attrs (dissoc datum :db/id :db/type)]
             (vswap! entity-ids conj eid)
             (jdbc/execute! tx
                            ["INSERT INTO entities (entity_id, entity_type, created_tx) VALUES (?, ?, ?)
                              ON CONFLICT(entity_id) DO NOTHING" eid etype tx-id])
             (doseq [[attr val] attrs]
               (assert-fact! tx eid attr val tx-id 1)))

           (and (vector? datum) (= :db/add (first datum)))
           (let [[_ eid attr val] datum]
             (vswap! entity-ids conj eid)
             (assert-fact! tx eid attr val tx-id 1))

           (and (vector? datum) (= :db/retract (first datum)))
           (let [[_ eid attr val] datum]
             (assert-fact! tx eid attr val tx-id 0))))
       {:tx-id tx-id :entity-ids (vec @entity-ids)}))))

;; ---------------------------------------------------------------------------
;; PATTERN D — current value of one attribute on one entity
;; ---------------------------------------------------------------------------

(defn lookup [conn entity-id attr]
  (when-let [row (q1 conn ["SELECT value FROM facts
                            WHERE entity_id = ? AND attribute = ? AND excised_at IS NULL
                            ORDER BY tx_id DESC LIMIT 1" entity-id (core/attr->sql attr)])]
    (core/decode-value (:value row))))

(defn- rows->entity [entity-id rows]
  (into {:db/id entity-id}
        (map (fn [{:keys [attribute value]}] [(keyword attribute) (core/decode-value value)]))
        rows))

;; Pull all current facts for one entity via the current_facts view
(defn pull-entity [conn entity-id]
  (rows->entity entity-id
                (q* conn ["SELECT attribute, value FROM current_facts WHERE entity_id = ?" entity-id])))

(defn- apply-pattern [entity pattern]
  (cond
    (or (= pattern '*) (= pattern ['*]) (= pattern [:*])) entity
    (vector? pattern) (select-keys entity (conj (set pattern) :db/id))
    :else entity))

(defn pull [conn entity-id pattern]
  (apply-pattern (pull-entity conn entity-id) pattern))

(defn pull-many [conn eids pattern]
  (mapv #(pull conn % pattern) eids))

(def entity pull-entity)

;; ---------------------------------------------------------------------------
;; PATTERN E — time-travel: entity state as of a given tx-id
;; ---------------------------------------------------------------------------

(defn as-of [conn entity-id as-of-tx]
  (rows->entity entity-id
                (q* conn ["SELECT attribute, value
                           FROM (
                             SELECT attribute, value, added,
                                    ROW_NUMBER() OVER (PARTITION BY attribute ORDER BY tx_id DESC) AS rn
                             FROM facts
                             WHERE entity_id = ? AND tx_id <= ? AND excised_at IS NULL
                           ) ranked
                           WHERE rn = 1 AND added = 1" entity-id as-of-tx])))

;; ---------------------------------------------------------------------------
;; PATTERN F — all entities of a given type
;; ---------------------------------------------------------------------------

(defn find-by-type [conn entity-type]
  (mapv :entity_id
        (q* conn ["SELECT entity_id FROM entities WHERE entity_type = ? AND retracted_tx IS NULL" entity-type])))

;; ---------------------------------------------------------------------------
;; PATTERN G — AVET lookup: entities where attribute currently equals value
;; ---------------------------------------------------------------------------

(defn find-by-attr [conn attr value]
  (mapv :entity_id
        (q* conn ["SELECT f.entity_id
                    FROM facts f
                    JOIN entities e ON e.entity_id = f.entity_id
                    WHERE f.attribute  = ?
                      AND f.value      = json(?)
                      AND f.excised_at IS NULL
                      AND f.added      = 1
                      AND f.tx_id = (
                        SELECT MAX(tx_id) FROM facts f2
                        WHERE f2.entity_id = f.entity_id
                          AND f2.attribute = f.attribute
                          AND f2.excised_at IS NULL
                      )
                    ORDER BY e.created_tx ASC"
                   (core/attr->sql attr) (core/encode-value value)])))

;; Simplified q: intersect find-by-attr across all literal-value :where clauses.
;; Clause form: [?e :attr val] — symbol in position 3 means "any value", skipped.
(defn q [conn {:keys [where]}]
  (let [value-clauses (filter (fn [[_ _ v]] (not (symbol? v))) where)]
    (if (empty? value-clauses)
      #{}
      (->> value-clauses
           (map (fn [[_ attr val]] (set (find-by-attr conn attr val))))
           (reduce set/intersection)))))

;; ---------------------------------------------------------------------------
;; History — full timeline via the fact_history view
;; ---------------------------------------------------------------------------

(defn history [conn entity-id]
  (mapv (fn [{:keys [attribute value added tx_id tx_time tx_meta]}]
          {:db/id     entity-id
           :attribute (keyword attribute)
           :value     (core/decode-value value)
           :added     (= 1 added)
           :tx-id     tx_id
           :tx-time   tx_time
           :tx-meta   (when tx_meta (core/decode-value tx_meta))})
        (q* conn ["SELECT attribute, value, added, tx_id, tx_time, tx_meta
                   FROM fact_history WHERE entity_id = ? ORDER BY tx_id ASC" entity-id])))

;; ---------------------------------------------------------------------------
;; PATTERN H — GDPR excision (right to forget)
;; ---------------------------------------------------------------------------

(defn excise!
  ([conn entity-id] (excise! conn entity-id nil))
  ([conn entity-id tx-id]
   (jdbc/with-transaction [tx conn]
     (jdbc/execute! tx ["UPDATE facts SET excised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE entity_id = ?" entity-id])
     (jdbc/execute! tx ["UPDATE entities SET retracted_tx = ? WHERE entity_id = ?" tx-id entity-id]))
   {:success true}))

;; ---------------------------------------------------------------------------
;; Schema registration
;; ---------------------------------------------------------------------------

(defn register-attrs! [conn attrs tx-id]
  (doseq [{:keys [ident value-type cardinality doc unique? component?]} attrs]
    (jdbc/execute! conn
                   ["INSERT INTO db_schema (ident, value_type, cardinality, doc, unique_val, is_component, created_tx)
                     VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(ident) DO NOTHING"
                    (core/attr->sql ident) (or value-type "string") (or cardinality "one") (or doc "")
                    (if unique? 1 0) (if component? 1 0) tx-id]))
  {:success true})

(defn transact-schema!
  ([conn attrs] (transact-schema! conn attrs nil))
  ([conn attrs tx-meta]
   (jdbc/with-transaction [tx conn]
     (let [tx-id (begin-tx! tx tx-meta)]
       (register-attrs! tx attrs tx-id)
       {:tx-id tx-id}))))

;; ---------------------------------------------------------------------------
;; Sync helpers — used by app.desktop.sync (Phase 4). Local-only concepts, no
;; equivalent needed in eav.cljs since the server is the sync counterparty, not
;; a sync client itself.
;; ---------------------------------------------------------------------------

(defn entity-type [conn entity-id]
  (:entity_type (q1 conn ["SELECT entity_type FROM entities WHERE entity_id = ?" entity-id])))

(defn entities-touched-since
  "Distinct entity-ids with any fact (assert or retract) recorded after tx-id-exclusive."
  [conn tx-id-exclusive]
  (mapv :entity_id
        (q* conn ["SELECT DISTINCT entity_id FROM facts WHERE tx_id > ?" tx-id-exclusive])))

(defn max-tx-id [conn]
  (or (:m (q1 conn ["SELECT MAX(id) AS m FROM transactions"])) 0))

(defn sync-state [conn]
  (q1 conn ["SELECT * FROM sync_meta WHERE id = 1"]))

(defn update-sync-state! [conn updates]
  (let [cols   (keys updates)
        set-sql (str/join ", " (map #(str (name %) " = ?") cols))]
    (jdbc/execute! conn (into [(str "UPDATE sync_meta SET " set-sql " WHERE id = 1")] (vals updates)))))
