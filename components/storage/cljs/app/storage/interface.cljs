(ns app.storage.interface
  (:require [clojure.set :as set]
            [integrant.core :as ig]
            [app.storage.eav :as eav]
            [app.storage.mem :as mem]))

;; ---------------------------------------------------------------------------
;; Module-level implementation atom.
;; Set once by the Integrant init-key (::d1 or ::memory).
;; All public functions delegate here — no `storage` arg needed by callers.
;; ---------------------------------------------------------------------------

(defonce ^:private impl (atom nil))

;; ---------------------------------------------------------------------------
;; Shared helpers
;; ---------------------------------------------------------------------------

(defn- apply-pattern [entity pattern]
  (cond
    (or (= pattern '*)
        (= pattern ['*])
        (= pattern [:*])) entity
    (vector? pattern)     (select-keys entity (conj (set pattern) :db/id))
    :else                 entity))

;; Simplified q: intersect AVET lookups for all literal-value :where clauses.
;; Clause form: [?e :attr val] — symbol in position 3 means "any value", skipped.
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
;; The returned map is also stored in `impl` for direct public-fn access.
;; ---------------------------------------------------------------------------

(defmethod ig/init-key ::d1 [_ {:keys [db prefix]}]
  (let [open-tx (fn [tx-meta f]
                  (-> (eav/begin-tx+ db prefix tx-meta) (.then f)))
        s {:transact!
           (fn [tx-data tx-meta] (eav/transact!+ db prefix tx-data tx-meta))

           :transact-schema!
           (fn [attrs tx-meta]
             (open-tx tx-meta
                      (fn [tx-id]
                        (-> (eav/register-attrs!+ db prefix attrs tx-id)
                            (.then (fn [_] {:tx-id tx-id}))))))

           :pull
           (fn [eid pattern]
             (-> (eav/pull-entity+ db prefix eid)
                 (.then #(apply-pattern % pattern))))

           :lookup        (fn [eid attr]   (eav/lookup+       db prefix eid attr))
           :as-of         (fn [eid tx-id]  (eav/as-of+        db prefix eid tx-id))
           :history       (fn [eid]        (eav/history+       db prefix eid))
           :find-by-type  (fn [etype]      (eav/find-by-type+  db prefix etype))
           :find-by-attr  (fn [attr val]   (eav/find-by-attr+  db prefix attr val))
           :q             (fn [query]      (q-impl (partial eav/find-by-attr+ db prefix) query))
           :excise!       (fn [eid tx-meta]
                            (open-tx tx-meta
                                     (fn [tx-id] (eav/excise!+ db prefix eid tx-id))))}]
    (reset! impl s)
    s))

;; ---------------------------------------------------------------------------
;; Integrant — ::memory  (in-process atom, for tests / local dev)
;; Optional :tx-data key pre-seeds facts at construction time.
;; ---------------------------------------------------------------------------

(defmethod ig/init-key ::memory [_ {:keys [tx-data]}]
  (let [state (mem/make-store)]
    ;; mem/transact!+ mutates state synchronously before returning the Promise
    (when (seq tx-data)
      (mem/transact!+ state tx-data nil))
    (let [open-tx (fn [tx-meta f]
                    (-> (mem/transact!+ state [] tx-meta) (.then (fn [{:keys [tx-id]}] (f tx-id)))))
          s {:transact!
             (fn [tx-data tx-meta] (mem/transact!+ state tx-data tx-meta))

             :transact-schema!
             (fn [attrs tx-meta]
               (open-tx tx-meta
                        (fn [tx-id]
                          (-> (mem/register-attrs!+ state attrs tx-id)
                              (.then (fn [_] {:tx-id tx-id}))))))

             :pull
             (fn [eid pattern]
               (-> (mem/pull-entity+ state eid)
                   (.then #(apply-pattern % pattern))))

             :lookup        (fn [eid attr]   (mem/lookup+       state eid attr))
             :as-of         (fn [eid tx-id]  (mem/as-of+        state eid tx-id))
             :history       (fn [eid]        (mem/history+       state eid))
             :find-by-type  (fn [etype]      (mem/find-by-type+  state etype))
             :find-by-attr  (fn [attr val]   (mem/find-by-attr+  state attr val))
             :q             (fn [query]      (q-impl (partial mem/find-by-attr+ state) query))
             :excise!       (fn [eid tx-meta]
                              (open-tx tx-meta
                                       (fn [tx-id] (mem/excise!+ state eid tx-id))))}]
      (reset! impl s)
      s)))

;; ---------------------------------------------------------------------------
;; Public API — Datahike-shaped, no `storage` parameter.
;; Callers just (require [app.storage.interface :as storage]) and call directly.
;;
;; Write
;;   (storage/transact!        tx-data)
;;   (storage/transact!        tx-data tx-meta)
;;   (storage/transact-schema! attrs)
;;   (storage/transact-schema! attrs tx-meta)
;;   (storage/excise!          entity-id)
;;   (storage/excise!          entity-id tx-meta)
;;
;; Read
;;   (storage/pull         eid pattern)   => Promise<entity-map>
;;   (storage/pull-many    eids pattern)  => Promise<[entity-map ...]>
;;   (storage/entity       eid)           => Promise<entity-map> (all attrs)
;;   (storage/lookup       eid attr)      => Promise<value | nil>
;;   (storage/as-of        eid tx-id)     => Promise<entity-map>
;;   (storage/history      eid)           => Promise<[datom ...]>
;;   (storage/find-by-type entity-type)   => Promise<[eid ...]>
;;   (storage/find-by-attr attr value)    => Promise<[eid ...]>
;;   (storage/q            query)         => Promise<#{eid ...}>
;; ---------------------------------------------------------------------------

(defn transact!
  ([tx-data]         ((:transact! @impl) tx-data nil))
  ([tx-data tx-meta] ((:transact! @impl) tx-data tx-meta)))

(defn transact-schema!
  ([attrs]           ((:transact-schema! @impl) attrs nil))
  ([attrs tx-meta]   ((:transact-schema! @impl) attrs tx-meta)))

(defn pull       [eid pattern]  ((:pull         @impl) eid pattern))
(defn pull-many  [eids pattern]
  (-> (js/Promise.all (into-array (map #(pull % pattern) eids)))
      (.then (fn [results] (vec (array-seq results))))))

(defn entity     [eid]          ((:pull         @impl) eid '*))
(defn lookup     [eid attr]     ((:lookup        @impl) eid attr))
(defn as-of      [eid tx-id]    ((:as-of         @impl) eid tx-id))
(defn history    [eid]          ((:history        @impl) eid))
(defn find-by-type [etype]      ((:find-by-type   @impl) etype))
(defn find-by-attr [attr val]   ((:find-by-attr   @impl) attr val))
(defn q          [query]        ((:q              @impl) query))

(defn excise!
  ([eid]           ((:excise! @impl) eid nil))
  ([eid tx-meta]   ((:excise! @impl) eid tx-meta)))
