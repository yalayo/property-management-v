(ns app.storage.interface
  (:require [clojure.set :as set]
            [integrant.core :as ig]
            [app.storage.eav :as eav]
            [app.storage.mem :as mem]))

;; ---------------------------------------------------------------------------
;; Shared helpers
;; ---------------------------------------------------------------------------

(defn- apply-pattern
  "Filter an entity map to the requested pull pattern.
   Pattern can be '* or [:attr/one :attr/two ...]"
  [entity pattern]
  (cond
    (or (= pattern '*)
        (= pattern ['*])
        (= pattern [:*]))  entity
    (vector? pattern)      (select-keys entity (conj (set pattern) :db/id))
    :else                  entity))

(defn- open-tx-then
  "Open a new transaction with tx-meta, then call (f tx-id). Returns a Promise."
  [begin-tx+ tx-meta f]
  (-> (begin-tx+ tx-meta)
      (.then f)))

;; ---------------------------------------------------------------------------
;; Simplified q: find entities matching :where clauses
;;
;; Supported clause forms:
;;   [?e :attr literal-val]  — AVET lookup (find-by-attr+)
;;   [?e :attr ?var]         — ignored for filtering (no value constraint)
;;
;; Returns Promise<#{entity-id ...}>
;; Multiple value clauses are intersected.
;; ---------------------------------------------------------------------------

(defn- q-impl [find-by-attr+ {:keys [where]}]
  (let [value-clauses (filter (fn [[_ _ v]] (not (symbol? v))) where)]
    (if (empty? value-clauses)
      (js/Promise.resolve #{})
      (-> (js/Promise.all
           (into-array
            (map (fn [[_ attr val]] (find-by-attr+ attr val)) value-clauses)))
          (.then (fn [results]
                   (let [sets (map set (array-seq results))]
                     (if (= 1 (count sets))
                       (first sets)
                       (apply set/intersection sets)))))))))

;; ---------------------------------------------------------------------------
;; Integrant — ::d1  (live Cloudflare D1 binding)
;; ---------------------------------------------------------------------------

(defmethod ig/init-key ::d1 [_ {:keys [db]}]
  {:transact!+
   (fn [tx-data tx-meta] (eav/transact!+ db tx-data tx-meta))

   :transact-schema!+
   (fn [attrs tx-meta]
     (open-tx-then (partial eav/begin-tx+ db) tx-meta
                   (fn [tx-id]
                     (-> (eav/register-attrs!+ db attrs tx-id)
                         (.then (fn [_] {:tx-id tx-id}))))))

   :pull+
   (fn [eid pattern]
     (-> (eav/pull-entity+ db eid)
         (.then #(apply-pattern % pattern))))

   :lookup+        (fn [eid attr]   (eav/lookup+       db eid attr))
   :as-of+         (fn [eid tx-id]  (eav/as-of+        db eid tx-id))
   :history+       (fn [eid]        (eav/history+       db eid))
   :find-by-type+  (fn [etype]      (eav/find-by-type+  db etype))
   :find-by-attr+  (fn [attr val]   (eav/find-by-attr+  db attr val))
   :q+             (fn [query]      (q-impl (partial eav/find-by-attr+ db) query))

   :excise!+
   (fn [eid tx-meta]
     (open-tx-then (partial eav/begin-tx+ db) tx-meta
                   (fn [tx-id] (eav/excise!+ db eid tx-id))))})

;; ---------------------------------------------------------------------------
;; Integrant — ::memory  (in-process atom store, for tests / local dev)
;;
;; Optional config key:
;;   :tx-data — initial datoms to transact on construction
;; ---------------------------------------------------------------------------

(defmethod ig/init-key ::memory [_ {:keys [tx-data]}]
  (let [state (mem/make-store)]
    ;; Pre-seed synchronously. mem/transact!+ mutates state before returning
    ;; the Promise, so it is safe to ignore the returned Promise here.
    (when (seq tx-data)
      (mem/transact!+ state tx-data nil))
    {:transact!+
     (fn [data meta] (mem/transact!+ state data meta))

     :transact-schema!+
     (fn [attrs tx-meta]
       (-> (mem/transact!+ state [] tx-meta)
           (.then (fn [{:keys [tx-id]}]
                    (-> (mem/register-attrs!+ state attrs tx-id)
                        (.then (fn [_] {:tx-id tx-id})))))))

     :pull+
     (fn [eid pattern]
       (-> (mem/pull-entity+ state eid)
           (.then #(apply-pattern % pattern))))

     :lookup+       (fn [eid attr]   (mem/lookup+       state eid attr))
     :as-of+        (fn [eid tx-id]  (mem/as-of+        state eid tx-id))
     :history+      (fn [eid]        (mem/history+       state eid))
     :find-by-type+ (fn [etype]      (mem/find-by-type+  state etype))
     :find-by-attr+ (fn [attr val]   (mem/find-by-attr+  state attr val))
     :q+            (fn [query]      (q-impl (partial mem/find-by-attr+ state) query))

     :excise!+
     (fn [eid tx-meta]
       (-> (mem/transact!+ state [] tx-meta)
           (.then (fn [{:keys [tx-id]}]
                    (mem/excise!+ state eid tx-id)))))}))

;; ---------------------------------------------------------------------------
;; Public API — Datahike-shaped
;;
;; Every function takes a `storage` map (from Integrant) as first arg.
;;
;; Write
;;   (transact! storage tx-data)
;;   (transact! storage tx-data tx-meta)
;;   (transact-schema! storage attrs)
;;   (transact-schema! storage attrs tx-meta)
;;   (excise! storage entity-id)
;;   (excise! storage entity-id tx-meta)
;;
;; Read
;;   (pull        storage eid pattern)
;;   (pull-many   storage eids pattern)
;;   (entity      storage eid)
;;   (lookup      storage eid attr)
;;   (as-of       storage eid tx-id)
;;   (history     storage eid)
;;   (find-by-type storage entity-type)
;;   (find-by-attr storage attr value)
;;   (q           storage query)
;; ---------------------------------------------------------------------------

(defn transact!
  ([storage tx-data]           ((:transact!+ storage) tx-data nil))
  ([storage tx-data tx-meta]   ((:transact!+ storage) tx-data tx-meta)))

(defn transact-schema!
  ([storage attrs]             ((:transact-schema!+ storage) attrs nil))
  ([storage attrs tx-meta]     ((:transact-schema!+ storage) attrs tx-meta)))

(defn pull       [storage eid pattern]   ((:pull+          storage) eid pattern))
(defn pull-many  [storage eids pattern]
  (-> (js/Promise.all (into-array (map #(pull storage % pattern) eids)))
      (.then (fn [results] (vec (array-seq results))))))

(defn entity     [storage eid]           (pull storage eid '*))
(defn lookup     [storage eid attr]      ((:lookup+        storage) eid attr))
(defn as-of      [storage eid tx-id]     ((:as-of+         storage) eid tx-id))
(defn history    [storage eid]           ((:history+        storage) eid))
(defn find-by-type [storage entity-type] ((:find-by-type+   storage) entity-type))
(defn find-by-attr [storage attr value]  ((:find-by-attr+   storage) attr value))

(defn q          [storage query]         ((:q+              storage) query))

(defn excise!
  ([storage eid]           ((:excise!+ storage) eid nil))
  ([storage eid tx-meta]   ((:excise!+ storage) eid tx-meta)))
