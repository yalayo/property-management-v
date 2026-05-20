(ns app.storage.mem
  (:require [app.storage.core :as core]))

;; ---------------------------------------------------------------------------
;; State shape
;;   :next-tx-id  — monotonic counter
;;   :transactions — {tx-id {:tx-id n :tx-time "ISO" :tx-meta {}}}
;;   :facts        — [{:id n :entity-id s :attribute s :value v :tx-id n
;;                     :added 0|1 :excised-at nil|"ISO"}]
;;   :entities     — {"eid" {:entity-id s :entity-type s :created-tx n
;;                            :retracted-tx nil|n}}
;;   :schema       — {"user/name" {:ident s :value-type s ...}}
;; ---------------------------------------------------------------------------

(defn make-store []
  (atom {:next-tx-id   0
         :transactions {}
         :facts        []
         :entities     {}
         :schema       {}}))

;; ---------------------------------------------------------------------------
;; Internal helpers
;; ---------------------------------------------------------------------------

(defn- begin-tx! [state tx-meta]
  (let [new-state (swap! state update :next-tx-id inc)
        tx-id     (:next-tx-id new-state)
        tx        {:tx-id   tx-id
                   :tx-time (.toISOString (js/Date.))
                   :tx-meta (or tx-meta {})}]
    (swap! state assoc-in [:transactions tx-id] tx)
    tx-id))

(defn- assert-fact! [state entity-id attr value tx-id added]
  (swap! state
         (fn [s]
           (update s :facts conj
                   {:id         (count (:facts s))
                    :entity-id  entity-id
                    :attribute  (core/attr->sql attr)
                    :value      (core/encode-value value)
                    :tx-id      tx-id
                    :added      added
                    :excised-at nil}))))

(defn- current-facts-for [state entity-id]
  (->> (:facts @state)
       (filter #(and (= (:entity-id %) entity-id) (nil? (:excised-at %))))
       (group-by :attribute)
       (map (fn [[attr rows]] [attr (first (sort-by :tx-id > rows))]))
       (filter (fn [[_ row]] (= 1 (:added row))))))

;; ---------------------------------------------------------------------------
;; Patterns — mirrors eav.cljs, all return Promise.resolve
;; ---------------------------------------------------------------------------

(defn transact!+ [state tx-data tx-meta]
  (let [tx-id      (begin-tx! state tx-meta)
        entity-ids (volatile! #{})]
    (doseq [datum tx-data]
      (cond
        (map? datum)
        (let [eid   (or (:db/id datum) (str (random-uuid)))
              etype (or (some-> (:db/type datum) name) "unknown")
              attrs (dissoc datum :db/id :db/type)]
          (vswap! entity-ids conj eid)
          (when-not (get-in @state [:entities eid])
            (swap! state assoc-in [:entities eid]
                   {:entity-id eid :entity-type etype :created-tx tx-id :retracted-tx nil}))
          (doseq [[attr val] attrs]
            (assert-fact! state eid attr val tx-id 1)))

        (and (vector? datum) (= :db/add (first datum)))
        (let [[_ eid attr val] datum]
          (vswap! entity-ids conj eid)
          (assert-fact! state eid attr val tx-id 1))

        (and (vector? datum) (= :db/retract (first datum)))
        (let [[_ eid attr val] datum]
          (assert-fact! state eid attr val tx-id 0))))

    (js/Promise.resolve {:tx-id tx-id :entity-ids (vec @entity-ids)})))

(defn pull-entity+ [state entity-id]
  (js/Promise.resolve
   (into {:db/id entity-id}
         (map (fn [[attr {:keys [value]}]]
                [(keyword attr) (core/decode-value value)])
              (current-facts-for state entity-id)))))

(defn lookup+ [state entity-id attr]
  (let [attr-sql (core/attr->sql attr)
        latest   (->> (:facts @state)
                      (filter #(and (= (:entity-id %) entity-id)
                                    (= (:attribute %) attr-sql)
                                    (nil? (:excised-at %))))
                      (sort-by :tx-id >)
                      first)]
    (js/Promise.resolve
     (when (and latest (= 1 (:added latest)))
       (core/decode-value (:value latest))))))

(defn as-of+ [state entity-id as-of-tx]
  (let [facts (->> (:facts @state)
                   (filter #(and (= (:entity-id %) entity-id)
                                 (<= (:tx-id %) as-of-tx)
                                 (nil? (:excised-at %))))
                   (group-by :attribute)
                   (map (fn [[attr rows]] [attr (first (sort-by :tx-id > rows))]))
                   (filter (fn [[_ row]] (= 1 (:added row)))))]
    (js/Promise.resolve
     (into {:db/id entity-id}
           (map (fn [[attr {:keys [value]}]] [(keyword attr) (core/decode-value value)]) facts)))))

(defn find-by-type+ [state entity-type]
  (js/Promise.resolve
   (->> (:entities @state)
        vals
        (filter #(and (= (:entity-type %) entity-type)
                      (nil? (:retracted-tx %))))
        (mapv :entity-id))))

(defn find-by-attr+ [state attr value]
  (let [attr-sql   (core/attr->sql attr)
        enc-value  (core/encode-value value)]
    (js/Promise.resolve
     (->> (:facts @state)
          (filter #(and (= (:attribute %) attr-sql) (nil? (:excised-at %))))
          (group-by :entity-id)
          (filter (fn [[_ rows]]
                    (let [latest (first (sort-by :tx-id > rows))]
                      (and (= (:value latest) enc-value)
                           (= 1 (:added latest))))))
          (mapv first)))))

(defn history+ [state entity-id]
  (let [txns (:transactions @state)]
    (js/Promise.resolve
     (->> (:facts @state)
          (filter #(and (= (:entity-id %) entity-id) (nil? (:excised-at %))))
          (sort-by :tx-id)
          (mapv (fn [{:keys [attribute value added tx-id]}]
                  (let [tx (get txns tx-id)]
                    {:db/id     entity-id
                     :attribute (keyword attribute)
                     :value     (core/decode-value value)
                     :added     (= 1 added)
                     :tx-id     tx-id
                     :tx-time   (:tx-time tx)
                     :tx-meta   (:tx-meta tx)})))))))

(defn excise!+ [state entity-id tx-id]
  (swap! state
         (fn [s]
           (-> s
               (update :facts
                       (fn [facts]
                         (mapv (fn [f]
                                 (if (= (:entity-id f) entity-id)
                                   (assoc f :excised-at (.toISOString (js/Date.)))
                                   f))
                               facts)))
               (assoc-in [:entities entity-id :retracted-tx] tx-id))))
  (js/Promise.resolve {:success true}))

(defn register-attrs!+ [state attrs tx-id]
  (doseq [{:keys [ident] :as attr} attrs]
    (when-not (get-in @state [:schema ident])
      (swap! state assoc-in [:schema ident] (merge {:created-tx tx-id} attr))))
  (js/Promise.resolve {:success true}))
