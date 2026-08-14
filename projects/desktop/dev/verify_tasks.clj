(ns verify-tasks
  "Headless fixture check for Phase S2 — feeds a small hand-built scenario
  through compute-tasks and asserts the expected tasks come back.
  Run with: clj -M:dev -m verify-tasks"
  (:require [app.desktop.tasks :as tasks]))

(defn- check [label pred]
  (println (if pred "PASS" "FAIL") "-" label)
  (when-not pred (System/exit 1)))

(defn -main [& _args]
  (let [year 2025
        ;; Property 1: missing acquisition-date/land-value/etc, has an
        ;; apartment with a tenant but missing wohnflaeche and no rent
        ;; payments recorded — should surface several tasks.
        prop1 {:db/id "prop-1" :property/name "Musterstrasse 1"
               :property/organization-id "org-1"}
        ;; Property 2: fully compliant, no apartments at all (edge case —
        ;; should raise no nebenkosten checks since nothing is rented, but
        ;; still raise the steuer checks since those are unconditional).
        prop2 {:db/id "prop-2" :property/name "Vollstaendig 2"
               :property/organization-id "org-1"
               :property/acquisition-date "2020-01-01"
               :property/land-value 10000 :property/building-value 50000
               :property/ownership-share 100 :property/year-built 1990
               :property/usage "full-rental"}
        apt1  {:db/id "apt-1" :apartment/property-id "prop-1" :apartment/code "01-EG-01"}
        tenant1 {:db/id "tenant-1" :tenant/apartment-id "apt-1"
                 :tenant/first-name "Max" :tenant/last-name "Mustermann"
                 :tenant/start-date "2024-01-01"}
        ctx {:properties [prop1 prop2] :apartments [apt1] :tenants [tenant1]
             :costs [] :apartment-costs [] :rent-payments []
             :garages [] :garage-payments [] :tax-configs []}
        {:keys [tasks total-checks passed-checks]} (tasks/compute-tasks ctx year)
        task-types (set (map :type tasks))]

    (println "total-checks:" total-checks "passed-checks:" passed-checks "tasks:" (count tasks))

    (check "acquisition-date missing for prop-1 is flagged" (contains? task-types :missing-acquisition-date))
    (check "land-value missing for prop-1 is flagged" (contains? task-types :missing-land-value))
    (check "wohnflaeche missing for apt-1 is flagged" (contains? task-types :missing-wohnflaeche))
    (check "market-rent missing for apt-1 (has active tenant) is flagged" (contains? task-types :missing-market-rent))
    (check "rent payments missing for apt-1 is flagged" (contains? task-types :missing-rent-payments))
    (check "prop-2 (fully compliant, no apartments) raises no missing-acquisition-date for itself"
           (not (some #(and (= :missing-acquisition-date (:type %)) (= "prop-2" (:property-id %))) tasks)))
    (check "tenant-1 missing kaltmiete/nebenkosten-warm is flagged" (contains? task-types :missing-tenant-miete))
    (check "tenant-1 missing residents-count is flagged" (contains? task-types :missing-tenant-personenzahl))
    (check "tasks sorted by priority ascending" (apply <= (map :priority tasks)))
    (check "total-checks > passed-checks (something is missing)" (> total-checks passed-checks))

    (println "\nAll checks passed."))
  (System/exit 0))
