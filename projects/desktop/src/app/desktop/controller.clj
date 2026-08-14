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

;; ---------------------------------------------------------------------------
;; Apartment — mirrors handle-get-apartments!/handle-create-apartment!/
;; handle-update-apartment!/handle-delete-apartment! (controller/core.cljs:343-419)
;; ---------------------------------------------------------------------------

(defn get-apartments [conn org-id]
  (let [eids (storage/find-by-attr conn :apartment/organization-id org-id)]
    {:apartments (storage/pull-many conn eids '[*])}))

(defn create-apartment! [conn org-id data]
  (let [result (core/process {:command :create-apartment :data data})]
    (if (:error result)
      result
      (let [{:keys [property-id code wohnflaeche market-rent strom-zaehler-nr wasser-zaehler-nrn]} (:entity result)
            dups (storage/q conn {:where [['?e :apartment/property-id property-id]
                                           ['?e :apartment/code code]]})]
        (if (seq dups)
          {:error :duplicate-code}
          (let [{:keys [tx-id entity-ids]}
                (storage/transact!
                 conn
                 [(cond-> {:db/type                   "apartment"
                           :apartment/organization-id  org-id
                           :apartment/property-id      property-id
                           :apartment/code             code
                           :apartment/occupied         false}
                    (some? wohnflaeche)        (assoc :apartment/wohnflaeche wohnflaeche)
                    (some? market-rent)        (assoc :apartment/market-rent market-rent)
                    (some? strom-zaehler-nr)   (assoc :apartment/strom-zaehler-nr strom-zaehler-nr)
                    (some? wasser-zaehler-nrn) (assoc :apartment/wasser-zaehler-nrn wasser-zaehler-nrn))])]
            {:tx-id tx-id :apartment-id (first entity-ids)}))))))

(defn update-apartment! [conn org-id data]
  (let [eid    (:id data)
        entity (storage/pull conn eid '*)]
    (if (not= (:apartment/organization-id entity) org-id)
      {:error :not-found}
      (let [result (core/process {:command :update-apartment :data data})]
        (if (:error result)
          result
          (let [{:keys [code occupied wohnflaeche market-rent strom-zaehler-nr wasser-zaehler-nrn leerstand]} (:updates result)
                {:keys [tx-id]}
                (storage/transact!
                 conn
                 [(cond-> {:db/id eid}
                    (some? code)               (assoc :apartment/code code)
                    (some? occupied)            (assoc :apartment/occupied (boolean occupied))
                    (some? wohnflaeche)         (assoc :apartment/wohnflaeche wohnflaeche)
                    (some? market-rent)         (assoc :apartment/market-rent market-rent)
                    (some? strom-zaehler-nr)    (assoc :apartment/strom-zaehler-nr strom-zaehler-nr)
                    (some? wasser-zaehler-nrn)  (assoc :apartment/wasser-zaehler-nrn wasser-zaehler-nrn)
                    (some? leerstand)           (assoc :apartment/leerstand (boolean leerstand)))])]
            {:tx-id tx-id}))))))

(defn delete-apartment! [conn org-id data]
  (let [eid    (:id data)
        entity (storage/pull conn eid '*)]
    (if (not= (:apartment/organization-id entity) org-id)
      {:error :not-found}
      (do (storage/excise! conn eid)
          {:ok true}))))

;; ---------------------------------------------------------------------------
;; Tenant — mirrors handle-get-tenants!/handle-create-tenant!/
;; handle-update-tenant!/handle-delete-tenant! (controller/core.cljs:459-568).
;; Two extra rules beyond Property/Apartment's simpler pattern: duplicate check
;; is org-wide by first+last name (not per-apartment), and a tenancy is
;; rejected if its date range overlaps an existing tenancy on the same
;; apartment (dates-overlap?, ported verbatim — pure string compares on ISO
;; dates, no JS interop in the original).
;; ---------------------------------------------------------------------------

(defn- dates-overlap? [new-start new-end existing-start existing-end]
  (let [new-end-inf?      (or (nil? new-end) (= "" new-end))
        existing-end-inf? (or (nil? existing-end) (= "" existing-end))
        eff-es (if (or (nil? existing-start) (= "" existing-start)) "0000-01-01" existing-start)]
    (cond
      (and new-end-inf? existing-end-inf?) true
      new-end-inf?      (not (pos? (compare new-start (or existing-end ""))))
      existing-end-inf? (not (pos? (compare eff-es (or new-end ""))))
      :else             (and (not (pos? (compare new-start (or existing-end ""))))
                              (not (pos? (compare eff-es (or new-end ""))))))))

(defn get-tenants [conn org-id]
  (let [eids (storage/find-by-attr conn :tenant/organization-id org-id)]
    {:tenants (storage/pull-many conn eids '[*])}))

(defn create-tenant! [conn org-id data]
  (let [result (core/process {:command :create-tenant :data data})]
    (if (:error result)
      result
      (let [{:keys [apartment-id first-name last-name email phone start-date end-date birthday household-members]} (:entity result)
            {:keys [kaltmiete nebenkosten-warm residents-count]} data
            miete-year (if (seq start-date)
                         (Integer/parseInt (subs start-date 0 4))
                         (.getYear (java.time.LocalDate/now)))
            dups (storage/q conn {:where [['?e :tenant/organization-id org-id]
                                           ['?e :tenant/first-name first-name]
                                           ['?e :tenant/last-name last-name]]})]
        (cond
          (seq dups)
          {:error :duplicate-name}

          (and apartment-id (seq start-date)
               (let [apt-tenants (storage/pull-many
                                   conn
                                   (storage/q conn {:where [['?e :tenant/apartment-id apartment-id]
                                                             ['?e :tenant/organization-id org-id]]})
                                   '[*])]
                 (some #(dates-overlap? start-date end-date (:tenant/start-date %) (:tenant/end-date %)) apt-tenants)))
          {:error :date-overlap}

          :else
          (let [{:keys [tx-id entity-ids]}
                (storage/transact!
                 conn
                 [(cond-> {:db/type                  "tenant"
                           :tenant/organization-id    org-id
                           :tenant/first-name         first-name
                           :tenant/last-name          last-name
                           :tenant/email              email
                           :tenant/phone              phone
                           :tenant/start-date         start-date
                           :tenant/end-date           end-date
                           :tenant/birthday           birthday
                           :tenant/household-members  household-members}
                    apartment-id             (assoc :tenant/apartment-id apartment-id)
                    (some? kaltmiete)         (assoc :tenant/kaltmiete kaltmiete)
                    (some? nebenkosten-warm)  (assoc :tenant/nebenkosten-warm nebenkosten-warm)
                    (some? residents-count)   (assoc :tenant/residents-count residents-count))])
                tenant-id (first entity-ids)]
            (when (or (some? kaltmiete) (some? nebenkosten-warm))
              (storage/transact!
               conn
               [(cond-> {:db/type                      "tenant-miete"
                         :tenant-miete/organization-id  org-id
                         :tenant-miete/tenant-id        tenant-id
                         :tenant-miete/year              miete-year}
                  (some? kaltmiete)        (assoc :tenant-miete/kaltmiete kaltmiete)
                  (some? nebenkosten-warm) (assoc :tenant-miete/nebenkosten-warm nebenkosten-warm))]))
            {:tx-id tx-id :tenant-id tenant-id}))))))

(defn update-tenant! [conn org-id data]
  (let [eid    (:id data)
        entity (storage/pull conn eid '*)]
    (if (not= (:tenant/organization-id entity) org-id)
      {:error :not-found}
      (let [result (core/process {:command :update-tenant :data data})]
        (if (:error result)
          result
          (let [{:keys [first-name last-name email phone start-date end-date birthday
                        household-members residents-count kaltmiete nebenkosten-warm]} (:updates result)
                {:keys [tx-id]}
                (storage/transact!
                 conn
                 [(cond-> {:db/id eid}
                    (some? first-name)        (assoc :tenant/first-name first-name)
                    (some? last-name)         (assoc :tenant/last-name last-name)
                    (some? email)             (assoc :tenant/email email)
                    (some? phone)             (assoc :tenant/phone phone)
                    (some? start-date)        (assoc :tenant/start-date start-date)
                    (some? end-date)          (assoc :tenant/end-date end-date)
                    (some? birthday)          (assoc :tenant/birthday birthday)
                    (some? household-members) (assoc :tenant/household-members household-members)
                    (some? residents-count)   (assoc :tenant/residents-count residents-count)
                    (some? kaltmiete)         (assoc :tenant/kaltmiete kaltmiete)
                    (some? nebenkosten-warm)  (assoc :tenant/nebenkosten-warm nebenkosten-warm))])]
            {:tx-id tx-id}))))))

(defn delete-tenant! [conn org-id data]
  (let [eid    (:id data)
        entity (storage/pull conn eid '*)]
    (if (not= (:tenant/organization-id entity) org-id)
      {:error :not-found}
      (do (storage/excise! conn eid)
          {:ok true}))))
