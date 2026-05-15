(ns app.letter.fugato
  (:require [fugato.core :as fugato]
            [clojure.test.check.generators :as gen]
            [app.letter.system :as system]
            [app.letter.rules :as rules]
            [clojure.test.check.properties :as prop]
            [clojure.test.check.clojure-test :refer [defspec]]))

;; ─── Initial model state ──────────────────────────────────────────────────────

(def initial-state
  {:tenant-info nil
   :cost-lines  []})

;; ─── Sample data pools ────────────────────────────────────────────────────────

(def sample-tenant
  {:tenant-id      "302d3365-e7fe-4875-b1f0-8b4ba52d6281"
   :last-name      "Brusberg"
   :street         "Kunigundastr.20"
   :location       "45131 Essen"
   :prepayment     100.35
   :heating-costs  13.0})

(def sample-lines
  [{:id :line/strom        :name "Allgemeinstrom"    :total 286.73   :pct 100.0 :key "Whfl." :sqm-pct 4.1}
   {:id :line/versicherung :name "Versicherung"      :total 4125.35  :pct 100.0 :key "Whfl." :sqm-pct 4.1}
   {:id :line/grundsteuer  :name "Grundsteuer"       :total 4244.38  :pct 100.0 :key "Whfl." :sqm-pct 4.1}
   {:id :line/muell        :name "Müllabfuhr"        :total 2899.2   :pct 100.0 :key "Whfl." :sqm-pct 4.1}
   {:id :line/trinkwasser  :name "Trinkwasser"       :total 1950.0   :pct 100.0 :key "Whfl." :sqm-pct 4.1}])

;; ─── Command specs ────────────────────────────────────────────────────────────

(def add-tenant-info-spec
  {:run?       (fn [state] (nil? (:tenant-info state)))

   :args       (fn [_state]
                 (gen/return [sample-tenant]))   ; extend with gen/fmap for fuzzing

   :next-state (fn [state {[[info]] :args}]
                 (assoc state :tenant-info info))

   :valid?     (fn [state _cmd]
                 (nil? (:tenant-info state)))})

(def add-cost-line-spec
  {:run?       (fn [state]
                 ;; Can always add lines, but only from the pool not yet added
                 (let [used-ids (set (map :id (:cost-lines state)))]
                   (seq (remove #(used-ids (:id %)) sample-lines))))

   :args       (fn [state]
                 (let [used-ids  (set (map :id (:cost-lines state)))
                       available (vec (remove #(used-ids (:id %)) sample-lines))]
                   (gen/tuple (gen/elements available))))

   :next-state (fn [state {[line] :args}]
                 (update state :cost-lines conj line))

   :valid?     (fn [state {[line] :args}]
                 (let [used-ids (set (map :id (:cost-lines state)))]
                   (not (used-ids (:id line)))))})

;; ─── Model ────────────────────────────────────────────────────────────────────

(def model
  {:add-tenant-info add-tenant-info-spec
   :add-cost-line   add-cost-line-spec})

;; ─── Property test ────────────────────────────────────────────────────────────

(defspec billing-model-eq-reality 50
  (prop/for-all [commands (fugato/commands model initial-state 10 1)]
    (let [model-end   (-> commands last meta :after)
          real-end    (system/project-state
                        (system/run-all initial-state commands))]
      (= model-end real-end))))

;; Bonus: when billing is complete, O'Doyle must produce a valid structure
(defspec billing-complete-when-ready 20
  (prop/for-all [commands (fugato/commands model initial-state 15 1)]
    (let [final-state (system/run-all initial-state commands)]
      (if (and (:tenant-info final-state) (seq (:cost-lines final-state)))
        (let [billing (system/get-billing final-state)]
          (and (some? billing)
               (number? (:total-costs billing))
               (boolean? (:refund billing))
               ;; Business rule: total = total-costs - prepayment
               (= (:total billing)
                  (- (:total-costs billing) (:prepayment final-state)))))
        true))))   ; incomplete state, skip assertion

;; ─── REPL tools ───────────────────────────────────────────────────────────────

(comment
  ;; Generate and inspect a sequence
  (let [cmds (gen/generate (fugato/commands model initial-state))]
    (println "Commands:" cmds)
    (system/get-billing (system/run-all initial-state cmds)))

  ;; Build manually, step by step
  (-> initial-state
      (system/add-tenant-info sample-tenant)
      (system/add-cost-line (first sample-lines))
      (system/add-cost-line (second sample-lines))
      system/get-billing)

  ;; Debug a specific failure
  (let [cmds [{:command :add-tenant-info :args [sample-tenant]}
              {:command :add-cost-line   :args [(first sample-lines)]}]]
    (clojure.data/diff
      (-> cmds last meta :after)
      (system/project-state (system/run-all initial-state cmds))))
  )