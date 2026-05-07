(ns app.storage.eav
  (:require [app.storage.core :as core]))

;; ---------------------------------------------------------------------------
;; PATTERN A — open a transaction, return its tx-id via last_row_id
;; ---------------------------------------------------------------------------

(defn begin-tx+ [db tx-meta]
  (-> (.prepare db "INSERT INTO transactions (tx_meta) VALUES (?)")
      (.bind (core/encode-value (or tx-meta {})))
      .run
      (.then (fn [r] (.. r -meta -last_row_id)))))

;; ---------------------------------------------------------------------------
;; PATTERN B / C — prepared statement builders (used inside transact!+)
;; ---------------------------------------------------------------------------

(defn- assert-fact-stmt [db entity-id attr value tx-id]
  (-> (.prepare db "INSERT INTO facts (entity_id, attribute, value, tx_id, added)
                    VALUES (?, ?, json(?), ?, 1)")
      (.bind entity-id (core/attr->sql attr) (core/encode-value value) tx-id)))

(defn- retract-fact-stmt [db entity-id attr value tx-id]
  (-> (.prepare db "INSERT INTO facts (entity_id, attribute, value, tx_id, added)
                    VALUES (?, ?, json(?), ?, 0)")
      (.bind entity-id (core/attr->sql attr) (core/encode-value value) tx-id)))

(defn- upsert-entity-stmt [db entity-id entity-type tx-id]
  (-> (.prepare db "INSERT INTO entities (entity_id, entity_type, created_tx)
                    VALUES (?, ?, ?)
                    ON CONFLICT(entity_id) DO NOTHING")
      (.bind entity-id (or entity-type "unknown") tx-id)))

;; ---------------------------------------------------------------------------
;; transact!+ — orchestrates A + B/C into one atomic write
;;
;; tx-data accepts three datum forms (same as Datahike):
;;   {:db/id "eid" :db/type "user" :user/name "Alice"}  — map assertion
;;   [:db/add    "eid" :attr val]                        — explicit assert
;;   [:db/retract "eid" :attr val]                       — retraction
;;
;; Returns Promise<{:tx-id n, :entity-ids [...]}>
;; ---------------------------------------------------------------------------

(defn transact!+ [db tx-data tx-meta]
  (-> (begin-tx+ db tx-meta)
      (.then
       (fn [tx-id]
         (let [stmts      (volatile! [])
               entity-ids (volatile! #{})]
           (doseq [datum tx-data]
             (cond
               (map? datum)
               (let [eid   (or (:db/id datum) (str (random-uuid)))
                     etype (or (some-> (:db/type datum) name) "unknown")
                     attrs (dissoc datum :db/id :db/type)]
                 (vswap! entity-ids conj eid)
                 (vswap! stmts conj (upsert-entity-stmt db eid etype tx-id))
                 (doseq [[attr val] attrs]
                   (vswap! stmts conj (assert-fact-stmt db eid attr val tx-id))))

               (and (vector? datum) (= :db/add (first datum)))
               (let [[_ eid attr val] datum]
                 (vswap! entity-ids conj eid)
                 (vswap! stmts conj (assert-fact-stmt db eid attr val tx-id)))

               (and (vector? datum) (= :db/retract (first datum)))
               (let [[_ eid attr val] datum]
                 (vswap! stmts conj (retract-fact-stmt db eid attr val tx-id)))))

           (if (seq @stmts)
             (-> (.batch db (into-array @stmts))
                 (.then (fn [_] {:tx-id tx-id :entity-ids (vec @entity-ids)})))
             (js/Promise.resolve {:tx-id tx-id :entity-ids []})))))))

;; ---------------------------------------------------------------------------
;; PATTERN D — current value of one attribute on one entity
;; ---------------------------------------------------------------------------

(defn lookup+ [db entity-id attr]
  (-> (.prepare db "SELECT value FROM facts
                    WHERE entity_id = ?
                      AND attribute = ?
                      AND excised_at IS NULL
                    ORDER BY tx_id DESC
                    LIMIT 1")
      (.bind entity-id (core/attr->sql attr))
      .all
      (.then (fn [r]
               (when-let [row (first (array-seq (.-results r)))]
                 (core/decode-value (.-value row)))))))

;; Pull all current facts for one entity via the current_facts view
(defn pull-entity+ [db entity-id]
  (-> (.prepare db "SELECT attribute, value FROM current_facts WHERE entity_id = ?")
      (.bind entity-id)
      .all
      (.then (fn [r]
               (into {:db/id entity-id}
                     (map (fn [row]
                            [(keyword (.-attribute row))
                             (core/decode-value (.-value row))])
                          (array-seq (.-results r))))))))

;; ---------------------------------------------------------------------------
;; PATTERN E — time-travel: entity state as of a given tx-id
;; ---------------------------------------------------------------------------

(defn as-of+ [db entity-id as-of-tx]
  (-> (.prepare db "SELECT attribute, value
                    FROM (
                      SELECT attribute, value, added,
                             ROW_NUMBER() OVER (PARTITION BY attribute ORDER BY tx_id DESC) AS rn
                      FROM facts
                      WHERE entity_id   = ?
                        AND tx_id      <= ?
                        AND excised_at IS NULL
                    ) ranked
                    WHERE rn = 1 AND added = 1")
      (.bind entity-id as-of-tx)
      .all
      (.then (fn [r]
               (into {:db/id entity-id}
                     (map (fn [row]
                            [(keyword (.-attribute row))
                             (core/decode-value (.-value row))])
                          (array-seq (.-results r))))))))

;; ---------------------------------------------------------------------------
;; PATTERN F — all entities of a given type
;; ---------------------------------------------------------------------------

(defn find-by-type+ [db entity-type]
  (-> (.prepare db "SELECT entity_id FROM entities
                    WHERE entity_type = ?
                      AND retracted_tx IS NULL")
      (.bind entity-type)
      .all
      (.then (fn [r]
               (mapv #(.-entity_id %) (array-seq (.-results r)))))))

;; ---------------------------------------------------------------------------
;; PATTERN G — AVET lookup: entities where attribute currently equals value
;; ---------------------------------------------------------------------------

(defn find-by-attr+ [db attr value]
  (-> (.prepare db "SELECT DISTINCT f.entity_id
                    FROM facts f
                    WHERE f.attribute  = ?
                      AND f.value      = json(?)
                      AND f.excised_at IS NULL
                      AND f.added      = 1
                      AND f.tx_id = (
                        SELECT MAX(tx_id) FROM facts f2
                        WHERE f2.entity_id = f.entity_id
                          AND f2.attribute = f.attribute
                          AND f2.excised_at IS NULL
                      )")
      (.bind (core/attr->sql attr) (core/encode-value value))
      .all
      (.then (fn [r]
               (mapv #(.-entity_id %) (array-seq (.-results r)))))))

;; ---------------------------------------------------------------------------
;; History — full timeline via the fact_history view
;; ---------------------------------------------------------------------------

(defn history+ [db entity-id]
  (-> (.prepare db "SELECT attribute, value, added, tx_id, tx_time, tx_meta
                    FROM fact_history
                    WHERE entity_id = ?
                    ORDER BY tx_id ASC")
      (.bind entity-id)
      .all
      (.then (fn [r]
               (mapv (fn [row]
                       {:db/id     entity-id
                        :attribute (keyword (.-attribute row))
                        :value     (core/decode-value (.-value row))
                        :added     (= 1 (.-added row))
                        :tx-id     (.-tx_id row)
                        :tx-time   (.-tx_time row)
                        :tx-meta   (when (.-tx_meta row)
                                     (js->clj (.parse js/JSON (.-tx_meta row))
                                              :keywordize-keys true))})
                     (array-seq (.-results r)))))))

;; ---------------------------------------------------------------------------
;; PATTERN H — GDPR excision (right to forget)
;; ---------------------------------------------------------------------------

(defn excise!+ [db entity-id tx-id]
  (.batch db
    (into-array
     [(-> (.prepare db "UPDATE facts
                        SET excised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                        WHERE entity_id = ?")
          (.bind entity-id))
      (-> (.prepare db "UPDATE entities SET retracted_tx = ? WHERE entity_id = ?")
          (.bind tx-id entity-id))])))

;; ---------------------------------------------------------------------------
;; Schema registration — insert attribute definitions into db_schema
;; ---------------------------------------------------------------------------

(defn register-attrs!+ [db attrs tx-id]
  (let [sql   "INSERT INTO db_schema
                 (ident, value_type, cardinality, doc, unique_val, is_component, created_tx)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(ident) DO NOTHING"
        stmts (mapv (fn [{:keys [ident value-type cardinality doc unique? component?]}]
                      (-> (.prepare db sql)
                          (.bind ident
                                 (or value-type "string")
                                 (or cardinality "one")
                                 (or doc "")
                                 (if unique? 1 0)
                                 (if component? 1 0)
                                 tx-id)))
                    attrs)]
    (if (seq stmts)
      (.batch db (into-array stmts))
      (js/Promise.resolve []))))
