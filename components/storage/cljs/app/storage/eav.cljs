(ns app.storage.eav
  (:require [clojure.string :as str]
            [app.storage.core :as core]))

(defn- tbl [prefix tname]
  (if (seq prefix) (str prefix "_" tname) tname))

;; ---------------------------------------------------------------------------
;; PATTERN A — open a transaction, return its tx-id via last_row_id
;; ---------------------------------------------------------------------------

(defn begin-tx+ [^js db prefix tx-meta]
  (-> (.prepare db (str "INSERT INTO " (tbl prefix "transactions") " (tx_meta) VALUES (?)"))
      (.bind (core/encode-value (or tx-meta {})))
      .run
      (.then (fn [^js r] (.. r -meta -last_row_id)))))

;; ---------------------------------------------------------------------------
;; PATTERN B / C — prepared statement builders (used inside transact!+)
;; ---------------------------------------------------------------------------

(defn- assert-fact-stmt [^js db prefix entity-id attr value tx-id]
  (-> (.prepare db (str "INSERT INTO " (tbl prefix "facts") " (entity_id, attribute, value, tx_id, added)
                    VALUES (?, ?, json(?), ?, 1)"))
      (.bind entity-id (core/attr->sql attr) (core/encode-value value) tx-id)))

(defn- retract-fact-stmt [^js db prefix entity-id attr value tx-id]
  (-> (.prepare db (str "INSERT INTO " (tbl prefix "facts") " (entity_id, attribute, value, tx_id, added)
                    VALUES (?, ?, json(?), ?, 0)"))
      (.bind entity-id (core/attr->sql attr) (core/encode-value value) tx-id)))

(defn- upsert-entity-stmt [^js db prefix entity-id entity-type tx-id]
  (-> (.prepare db (str "INSERT INTO " (tbl prefix "entities") " (entity_id, entity_type, created_tx)
                    VALUES (?, ?, ?)
                    ON CONFLICT(entity_id) DO NOTHING"))
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

(defn transact!+ [^js db prefix tx-data tx-meta]
  (-> (begin-tx+ db prefix tx-meta)
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
                 (vswap! stmts conj (upsert-entity-stmt db prefix eid etype tx-id))
                 (doseq [[attr val] attrs]
                   (vswap! stmts conj (assert-fact-stmt db prefix eid attr val tx-id))))

               (and (vector? datum) (= :db/add (first datum)))
               (let [[_ eid attr val] datum]
                 (vswap! entity-ids conj eid)
                 (vswap! stmts conj (assert-fact-stmt db prefix eid attr val tx-id)))

               (and (vector? datum) (= :db/retract (first datum)))
               (let [[_ eid attr val] datum]
                 (vswap! stmts conj (retract-fact-stmt db prefix eid attr val tx-id)))))

           (if (seq @stmts)
             (-> (.batch db (into-array @stmts))
                 (.then (fn [_] {:tx-id tx-id :entity-ids (vec @entity-ids)})))
             (js/Promise.resolve {:tx-id tx-id :entity-ids []})))))))

;; ---------------------------------------------------------------------------
;; PATTERN D — current value of one attribute on one entity
;; ---------------------------------------------------------------------------

(defn lookup+ [^js db prefix entity-id attr]
  (-> (.prepare db (str "SELECT value FROM " (tbl prefix "facts") "
                    WHERE entity_id = ?
                      AND attribute = ?
                      AND excised_at IS NULL
                    ORDER BY tx_id DESC
                    LIMIT 1"))
      (.bind entity-id (core/attr->sql attr))
      .all
      (.then (fn [^js r]
               (when-let [^js row (first (array-seq (.-results r)))]
                 (core/decode-value (.-value row)))))))

;; Pull all current facts for one entity via the current_facts view
(defn pull-entity+ [^js db prefix entity-id]
  (-> (.prepare db (str "SELECT attribute, value FROM " (tbl prefix "current_facts") " WHERE entity_id = ?"))
      (.bind entity-id)
      .all
      (.then (fn [^js r]
               (into {:db/id entity-id}
                     (map (fn [^js row]
                            [(keyword (.-attribute row))
                             (core/decode-value (.-value row))])
                          (array-seq (.-results r))))))))

;; ---------------------------------------------------------------------------
;; PATTERN E — time-travel: entity state as of a given tx-id
;; ---------------------------------------------------------------------------

(defn as-of+ [^js db prefix entity-id as-of-tx]
  (-> (.prepare db (str "SELECT attribute, value
                    FROM (
                      SELECT attribute, value, added,
                             ROW_NUMBER() OVER (PARTITION BY attribute ORDER BY tx_id DESC) AS rn
                      FROM " (tbl prefix "facts") "
                      WHERE entity_id   = ?
                        AND tx_id      <= ?
                        AND excised_at IS NULL
                    ) ranked
                    WHERE rn = 1 AND added = 1"))
      (.bind entity-id as-of-tx)
      .all
      (.then (fn [^js r]
               (into {:db/id entity-id}
                     (map (fn [^js row]
                            [(keyword (.-attribute row))
                             (core/decode-value (.-value row))])
                          (array-seq (.-results r))))))))

;; ---------------------------------------------------------------------------
;; PATTERN F — all entities of a given type
;; ---------------------------------------------------------------------------

(defn find-by-type+ [^js db prefix entity-type]
  (-> (.prepare db (str "SELECT entity_id FROM " (tbl prefix "entities") "
                    WHERE entity_type = ?
                      AND retracted_tx IS NULL"))
      (.bind entity-type)
      .all
      (.then (fn [^js r]
               (mapv (fn [^js row] (.-entity_id row))
                     (array-seq (.-results r)))))))

;; ---------------------------------------------------------------------------
;; PATTERN G — AVET lookup: entities where attribute currently equals value
;; ---------------------------------------------------------------------------

(defn find-by-attr+ [^js db prefix attr value]
  (let [attr-sql (core/attr->sql attr)
        val-sql  (core/encode-value value)]
    (-> (.prepare db (str "SELECT f.entity_id
                      FROM " (tbl prefix "facts") " f
                      JOIN " (tbl prefix "entities") " e ON e.entity_id = f.entity_id
                      WHERE f.attribute  = ?
                        AND f.value      = json(?)
                        AND f.excised_at IS NULL
                        AND f.added      = 1
                        AND f.tx_id = (
                          SELECT MAX(tx_id) FROM " (tbl prefix "facts") " f2
                          WHERE f2.entity_id = f.entity_id
                            AND f2.attribute = f.attribute
                            AND f2.excised_at IS NULL
                        )
                      ORDER BY e.created_tx ASC"))
        (.bind attr-sql val-sql)
        .all
        (.then (fn [^js r]
                 (let [rows (array-seq (.-results r))]
                   (mapv (fn [^js row] (.-entity_id row)) rows)))))))

;; ---------------------------------------------------------------------------
;; History — full timeline via the fact_history view
;; ---------------------------------------------------------------------------

(defn history+ [^js db prefix entity-id]
  (-> (.prepare db (str "SELECT attribute, value, added, tx_id, tx_time, tx_meta
                    FROM " (tbl prefix "fact_history") "
                    WHERE entity_id = ?
                    ORDER BY tx_id ASC"))
      (.bind entity-id)
      .all
      (.then (fn [^js r]
               (mapv (fn [^js row]
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

(defn excise!+ [^js db prefix entity-id tx-id]
  (.batch db
    (into-array
     [(-> (.prepare db (str "UPDATE " (tbl prefix "facts") "
                        SET excised_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                        WHERE entity_id = ?"))
          (.bind entity-id))
      (-> (.prepare db (str "UPDATE " (tbl prefix "entities") " SET retracted_tx = ? WHERE entity_id = ?"))
          (.bind tx-id entity-id))])))

;; ---------------------------------------------------------------------------
;; Schema registration — insert attribute definitions into db_schema
;; ---------------------------------------------------------------------------

(defn register-attrs!+ [^js db prefix attrs tx-id]
  (let [sql   (str "INSERT INTO " (tbl prefix "db_schema") "
                 (ident, value_type, cardinality, doc, unique_val, is_component, created_tx)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(ident) DO NOTHING")
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

;; ---------------------------------------------------------------------------
;; Admin export / import — raw row dump and restore
;; ---------------------------------------------------------------------------

(defn- raw-query+ [^js db sql params]
  (let [stmt (.prepare db sql)]
    (-> (.apply (.-bind stmt) stmt (into-array params))
        .all
        (.then (fn [^js r]
                 (mapv (fn [^js row] (js->clj row :keywordize-keys true))
                       (array-seq (.-results r))))))))

(defn- batch-rows!+ [^js db sql rows col-keys]
  (if (empty? rows)
    (js/Promise.resolve nil)
    (let [stmts  (mapv (fn [row]
                         (let [vals (mapv #(get row %) col-keys)
                               stmt (.prepare db sql)]
                           (.apply (.-bind stmt) stmt (into-array vals))))
                       rows)
          chunks (partition-all 50 stmts)]
      (reduce (fn [p chunk]
                (.then p (fn [_] (.batch db (into-array chunk)))))
              (js/Promise.resolve nil)
              chunks))))

(defn dump-org+ [^js db prefix org-id account-eid membership-eid]
  (let [encoded-oid (str "\"" org-id "\"")]
    (-> (raw-query+ db
                    (str "SELECT DISTINCT entity_id FROM " (tbl prefix "facts")
                         " WHERE value = ? AND excised_at IS NULL")
                    [encoded-oid])
        (.then
         (fn [ref-rows]
           (let [all-eids (->> ref-rows
                               (map :entity_id)
                               (concat [org-id account-eid membership-eid])
                               distinct
                               vec)
                 in-ph    (str "(" (str/join "," (repeat (count all-eids) "?")) ")")]
             (-> (raw-query+ db (str "SELECT * FROM " (tbl prefix "entities") " WHERE entity_id IN " in-ph) all-eids)
                 (.then (fn [entities]
                          (-> (raw-query+ db (str "SELECT * FROM " (tbl prefix "facts") " WHERE entity_id IN " in-ph) all-eids)
                              (.then (fn [facts]
                                       (let [tx-ids (->> facts (map :tx_id) distinct vec)]
                                         (if (empty? tx-ids)
                                           {:entities entities :facts facts :transactions []}
                                           (let [tx-ph (str "(" (str/join "," (repeat (count tx-ids) "?")) ")")]
                                             (-> (raw-query+ db (str "SELECT * FROM " (tbl prefix "transactions") " WHERE tx_id IN " tx-ph) tx-ids)
                                                 (.then (fn [transactions]
                                                          {:entities     entities
                                                           :facts        facts
                                                           :transactions transactions}))))))))))))))))))

(defn restore-org!+ [^js db prefix {:keys [entities facts transactions]}]
  (let [tx-sql   (str "INSERT OR REPLACE INTO " (tbl prefix "transactions") " (tx_id,tx_meta,tx_time) VALUES (?,?,?)")
        ent-sql  (str "INSERT OR REPLACE INTO " (tbl prefix "entities") " (entity_id,entity_type,created_tx,retracted_tx) VALUES (?,?,?,?)")
        fact-sql (str "INSERT OR REPLACE INTO " (tbl prefix "facts") " (id,entity_id,attribute,value,tx_id,added,excised_at) VALUES (?,?,?,?,?,?,?)")]
    (-> (batch-rows!+ db tx-sql   transactions [:tx_id :tx_meta :tx_time])
        (.then (fn [_] (batch-rows!+ db ent-sql  entities     [:entity_id :entity_type :created_tx :retracted_tx])))
        (.then (fn [_] (batch-rows!+ db fact-sql facts        [:id :entity_id :attribute :value :tx_id :added :excised_at])))
        (.then (fn [_] {:ok true})))))
