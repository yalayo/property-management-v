(ns app.letter.system
  (:require [app.letter.rules :as rules]))

;; ─── Pure state shape (mirrors fugato model) ──────────────────────────────────
;; {:tenant-info nil | {...}
;;  :cost-lines  []            ; list of raw line maps
;;  :complete?   false}

(defn rebuild-session
  "Rebuild an O'Doyle session from scratch using current state.
   Since sessions are immutable values, this is cheap and idempotent."
  [state]
  (let [session (rules/new-session)]
    (cond-> session
      (:tenant-info state)
      (rules/insert-tenant-info (:tenant-info state))

      (seq (:cost-lines state))
      (rules/insert-cost-lines (:cost-lines state)))))

;; ─── Command implementations ──────────────────────────────────────────────────

(defn add-tenant-info [state info]
  (assoc state :tenant-info info))

(defn add-cost-line [state line]
  (update state :cost-lines conj line))

(defn get-billing [state]
  (-> state rebuild-session rules/query-billing))

;; ─── Command dispatch (used by fugato's run) ──────────────────────────────────

(def command->fn
  {:add-tenant-info #'add-tenant-info
   :add-cost-line   #'add-cost-line})

(defn run [state {:keys [command args]}]
  (if-let [f (get command->fn command)]
    (apply f state args)
    (throw (ex-info "Unknown command" {:command command :args args}))))

(defn run-all [state commands]
  (reduce run state commands))

(defn project-state
  "Project full state to the shape the fugato model tracks."
  [state]
  (select-keys state [:tenant-info :cost-lines]))