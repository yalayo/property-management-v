(ns app.desktop.controller
  "Local command handlers for the desktop app — Property vertical slice.

  Mirrors components/controller/cljs/app/controller/core.cljs's Property
  handlers (handle-get-properties!/handle-create-property!/
  handle-update-property!/handle-delete-property!) field-for-field and
  rule-for-rule (duplicate-name-within-org, org-scoping on update/delete), but
  synchronous (plain values, no js/Promise) and without the
  auth/trial/feature-gating those handlers layer on top: the desktop app is
  single-user/single-org per local database (org-id comes from the logged-in
  session — see app.desktop.session), and the server remains the sole
  authority on trial/feature gating when this data syncs."
  (:require [app.storage.sqlite :as storage]
            [app.core.system :as core]))

(defn get-properties [conn org-id]
  (let [eids (storage/find-by-attr conn :property/organization-id org-id)]
    {:properties (storage/pull-many conn eids '[*])}))

(defn create-property! [conn org-id data]
  (let [result (core/process {:command :create-property :data data})]
    (if (:error result)
      result
      (let [{:keys [name address city postal-code country units
                    acquisition-date purchase-price current-value
                    land-value building-value ownership-share
                    living-area-m2 rental-area-m2 year-built usage]} (:entity result)
            dups (storage/q conn {:where [['?e :property/organization-id org-id]
                                           ['?e :property/name name]]})]
        (if (seq dups)
          {:error :duplicate-name}
          (let [{:keys [tx-id entity-ids]}
                (storage/transact!
                 conn
                 [(cond-> {:db/type                   "property"
                           :property/organization-id  org-id
                           :property/name             name
                           :property/address          address
                           :property/city             city
                           :property/postal-code      postal-code
                           :property/country          country
                           :property/units            units
                           :property/acquisition-date acquisition-date
                           :property/purchase-price   purchase-price
                           :property/current-value    current-value}
                    land-value      (assoc :property/land-value land-value)
                    building-value  (assoc :property/building-value building-value)
                    ownership-share (assoc :property/ownership-share ownership-share)
                    living-area-m2  (assoc :property/living-area-m2 living-area-m2)
                    rental-area-m2  (assoc :property/rental-area-m2 rental-area-m2)
                    year-built      (assoc :property/year-built year-built)
                    usage           (assoc :property/usage usage))])]
            {:tx-id tx-id :property-id (first entity-ids)}))))))

(defn update-property! [conn org-id data]
  (let [eid    (:id data)
        entity (storage/pull conn eid '*)]
    (if (not= (:property/organization-id entity) org-id)
      {:error :not-found}
      (let [result (core/process {:command :update-property :data data})]
        (if (:error result)
          result
          (let [{:keys [name address city postal-code country units
                        purchase-price current-value iban bank-name landlord-name
                        landlord-street landlord-postal-city
                        acquisition-date land-value building-value ownership-share
                        living-area-m2 rental-area-m2 year-built usage]} (:updates result)
                dups      (storage/q conn {:where [['?e :property/organization-id org-id]
                                                    ['?e :property/name name]]})
                conflicts (filter #(not= % eid) (vec dups))]
            (if (seq conflicts)
              {:error :duplicate-name}
              (let [{:keys [tx-id]}
                    (storage/transact!
                     conn
                     [(cond-> {:db/id eid}
                        (some? name)                 (assoc :property/name name)
                        (some? address)              (assoc :property/address address)
                        (some? city)                 (assoc :property/city city)
                        (some? postal-code)          (assoc :property/postal-code postal-code)
                        (some? country)              (assoc :property/country country)
                        (some? units)                (assoc :property/units units)
                        (some? purchase-price)       (assoc :property/purchase-price purchase-price)
                        (some? current-value)        (assoc :property/current-value current-value)
                        (some? iban)                 (assoc :property/iban iban)
                        (some? bank-name)            (assoc :property/bank-name bank-name)
                        (some? landlord-name)        (assoc :property/landlord-name landlord-name)
                        (some? landlord-street)      (assoc :property/landlord-street landlord-street)
                        (some? landlord-postal-city) (assoc :property/landlord-postal-city landlord-postal-city)
                        (some? acquisition-date)     (assoc :property/acquisition-date acquisition-date)
                        (some? land-value)           (assoc :property/land-value land-value)
                        (some? building-value)       (assoc :property/building-value building-value)
                        (some? ownership-share)      (assoc :property/ownership-share ownership-share)
                        (some? living-area-m2)       (assoc :property/living-area-m2 living-area-m2)
                        (some? rental-area-m2)       (assoc :property/rental-area-m2 rental-area-m2)
                        (some? year-built)           (assoc :property/year-built year-built)
                        (some? usage)                (assoc :property/usage usage))])]
                {:tx-id tx-id}))))))))

(defn delete-property! [conn org-id data]
  (let [eid    (:id data)
        entity (storage/pull conn eid '*)]
    (if (not= (:property/organization-id entity) org-id)
      {:error :not-found}
      (do (storage/excise! conn eid)
          {:ok true}))))
