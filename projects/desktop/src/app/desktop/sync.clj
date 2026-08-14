(ns app.desktop.sync
  "On-demand two-way sync for the locally-writable entities (Property,
  Apartment, Tenant — see the plan's Phase N3/N4). Protocol: push/pull full
  current *snapshots* of touched entities (not raw assert/retract deltas) —
  simpler than deltas, and consistent with the documented conflict policy
  (last-write-wins per attribute by server tx order, same as `current_facts`
  already gives every other client). Entity IDs never collide across
  client/server since both sides generate random UUIDs, so no ID-remapping is
  needed either direction."
  (:require [app.storage.sqlite :as storage]
            [app.desktop.api :as api]))

(def ^:private pushable-types #{"property" "apartment" "tenant"})

(defn- entity->snapshot [conn eid]
  (when-let [etype (storage/entity-type conn eid)]
    (assoc (storage/pull conn eid '*) :db/type etype)))

(defn push!
  "Sends every locally-touched Property/Apartment/Tenant since the last
  successful push. Returns {:pushed n} or {:error ...}."
  [conn jwt]
  (let [{:keys [last_pushed_tx_id]} (storage/sync-state conn)
        eids     (storage/entities-touched-since conn last_pushed_tx_id)
        entities (->> eids
                      (keep #(entity->snapshot conn %))
                      (filter #(pushable-types (:db/type %)))
                      vec)]
    (if (empty? entities)
      {:pushed 0}
      (let [result    (api/sync-push jwt entities)
            local-max (storage/max-tx-id conn)]
        (if (:error result)
          result
          (do (storage/update-sync-state! conn {:last_pushed_tx_id local-max})
              {:pushed (count entities)}))))))

(defn pull!
  "Fetches every property touched (by any client) since the last successful
  pull and applies it locally. Returns {:pulled n} or {:error ...}."
  [conn jwt]
  (let [{:keys [last_pulled_server_tx_id]} (storage/sync-state conn)
        result (api/sync-pull jwt last_pulled_server_tx_id)]
    (if (:error result)
      result
      (let [{:keys [properties max-tx-id]} result]
        (when (seq properties)
          (storage/transact! conn
                              (mapv #(assoc % :db/type "property") properties)
                              {:source "desktop-sync-pull"}))
        (storage/update-sync-state! conn {:last_pulled_server_tx_id (or max-tx-id last_pulled_server_tx_id)})
        {:pulled (count properties)}))))

;; ---------------------------------------------------------------------------
;; Reference-data pull — everything the tasks (Offene Aufgaben) compliance
;; engine needs besides Property. Read-only from the desktop's perspective for
;; now: there is no local create/update for these entity types yet (see the
;; plan's Phase S5), so this only ever overwrites local state with whatever
;; the server currently has — never pushes anything back up.
;; ---------------------------------------------------------------------------

(def ^:private reference-entities
  "[command response-key db-type] — response-key picks the right field out of
  the command's response map (:get-all-costs and :get-all-apartment-costs both
  respond with {:costs [...]}, disambiguated here by db-type)."
  [[:get-apartments           :apartments            "apartment"]
   [:get-tenants              :tenants               "tenant"]
   [:get-all-costs            :costs                 "cost"]
   [:get-all-apartment-costs  :costs                 "apartment-cost"]
   [:get-all-rent-payments    :rent-payments         "rent-payment"]
   [:get-all-garages          :garages               "garage"]
   [:get-all-garage-payments  :garage-payments       "garage-payment"]
   [:get-expense-types        :expense-types         "expense-type"]
   [:get-property-tax-configs :property-tax-configs  "property-tax-config"]])

(defn pull-reference-data!
  "Returns {:reference-pulled n} or {:error ...} (fails fast on the first
  entity type that errors, since by the time this runs in `sync!` the property
  push/pull already succeeded, i.e. we know we're online)."
  [conn jwt]
  (reduce
   (fn [acc [command response-key db-type]]
     (if (:error acc)
       (reduced acc)
       (let [result (api/get-entities jwt command)]
         (if (:error result)
           {:error (:error result)}
           (let [entities (get result response-key)]
             (when (seq entities)
               (storage/transact! conn
                                   (mapv #(assoc % :db/type db-type) entities)
                                   {:source "desktop-sync-reference"}))
             (update acc :reference-pulled + (count entities)))))))
   {:reference-pulled 0}
   reference-entities))

(defn sync!
  "Push then pull Property, then pull reference data. Stops (and surfaces the
  error) at the first failure — e.g. offline — rather than continuing on top
  of a possibly-inconsistent local state."
  [conn jwt]
  (let [push-result (push! conn jwt)]
    (if (:error push-result)
      push-result
      (let [pull-result (pull! conn jwt)]
        (if (:error pull-result)
          (merge push-result pull-result)
          (merge push-result pull-result (pull-reference-data! conn jwt)))))))
