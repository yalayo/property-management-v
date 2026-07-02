(ns app.controller.core
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]
            [clojure.string :as str]))

;; ---------------------------------------------------------------------------
;; Shared helpers
;; ---------------------------------------------------------------------------

(defn- hash-password [password salt]
  (let [input   (str salt ":" password)
        encoder (js/TextEncoder.)
        data    (.encode encoder input)]
    (-> (js/Promise.resolve (.digest js/crypto.subtle "SHA-256" data))
        (.then (fn [^js hash-buffer]
                 (let [hash-array (js/Uint8Array. hash-buffer)]
                   (->> hash-array
                        (map (fn [b] (.padStart (.toString b 16) 2 "0")))
                        (apply str))))))))

(defn- with-org
  "Guards a handler that needs an authenticated org-id.
  Calls (f org-id) when user is authenticated, returns {:error :unauthorized} otherwise."
  [user f]
  (if-let [org-id (:org-id user)]
    (f org-id)
    {:error :unauthorized}))

(defn- pull-many+ [storage eids pattern]
  (-> (js/Promise.all (into-array (map #((:pull storage) % pattern) eids)))
      (.then (fn [results] (vec (array-seq results))))))

(defn- impersonation-meta [user]
  (when-let [admin (:impersonated-by user)]
    (str "{\"impersonated-by\":\"" admin "\"}")))

(defn- with-impersonation-meta [storage user]
  (if-let [meta (impersonation-meta user)]
    (-> storage
        (update :transact! (fn [t!] (fn [entities _] (t! entities meta))))
        (update :excise!   (fn [e!] (fn [eid _]       (e! eid meta)))))
    storage))

(defn- trial-access? [user]
  (or (:superadmin user)
      (:impersonated-by user)
      (some? (:plan user))
      (and (some? (:trialExpiresAt user))
           (> (:trialExpiresAt user) (.now js/Date)))))

(def ^:private trial-gated-commands
  #{:create-property      :create-apartment         :start-onboarding
    :create-tenant        :assign-tenant-to-apartment
    :create-rent-payment  :create-apartment-cost    :create-cost
    :create-expense-type  :upsert-tenant-miete
    :create-garage        :assign-tenant-to-garage
    :upsert-property-tax-config
    :create-property-loan :create-property-maintenance})

(defn- fetch-account [storage email]
  (js-await [eids ((:find-by-attr storage) :account/email email)]
            (when-let [eid (first eids)]
              ((:pull storage) eid '*))))

(defn- fetch-membership [storage account-id]
  (js-await [eids ((:find-by-attr storage) :membership/account-id account-id)]
            (when-let [eid (first eids)]
              ((:pull storage) eid '*))))


(declare dates-overlap?)

;; ---------------------------------------------------------------------------
;; Trial helpers
;; ---------------------------------------------------------------------------

(def ^:private trial-duration-ms (* 7 24 60 60 1000))

(defn- compute-trial [org]
  (let [started-at (:organization/trial-started-at org)]
    (when started-at
      (let [elapsed-ms (or (:organization/trial-elapsed-ms org) 0)
            resumed-at (:organization/trial-resumed-at org)
            paused?    (boolean (:organization/trial-paused org))
            now        (.now js/Date)
            active-ms  (if (and (not paused?) (number? resumed-at) (pos? resumed-at))
                         (max 0 (- now resumed-at)) 0)
            total-ms   (+ elapsed-ms active-ms)
            remaining  (max 0 (- trial-duration-ms total-ms))
            expired?   (>= total-ms trial-duration-ms)
            status     (cond expired? "expired" paused? "paused" :else "active")]
        {:status         status
         :days-remaining (/ remaining 86400000.0)
         :started-at     started-at
         :paused         paused?
         :history        (try (js->clj (js/JSON.parse (or (:organization/trial-history org) "[]")) :keywordize-keys false)
                               (catch :default _ []))}))))

;; ---------------------------------------------------------------------------
;; Auth handlers
;; ---------------------------------------------------------------------------

(defn- handle-sign-up! [core storage data env]
  (js-await [db-user (fetch-account storage (:email data))]
            (let [process (:process core)
                  transact (:transact! storage)
                  result (process {:command :user-sign-up :data data :db-user db-user})]
              (println "Current user: " db-user " After: " result) 
              (if (= :create-account-with-org (:action result))
                (js-await [hashed              (hash-password (get-in result [:user-data :password])
                                                              (aget env "JWT_SECRET"))
                           {account-eids :entity-ids} (transact
                                                        [{:db/type          "account"
                                                          :account/email    (get-in result [:user-data :email])
                                                          :account/name     (get-in result [:user-data :name])
                                                          :account/password hashed
                                                          :account/verified false
                                                          :account/plan     nil}] nil)
                           {org-eids :entity-ids}     (transact
                                                        [{:db/type           "organization"
                                                          :organization/name (get-in result [:user-data :name])}] nil)
                           _                          (transact
                                                       [{:db/type                    "membership"
                                                         :membership/account-id      (first account-eids)
                                                         :membership/organization-id (first org-eids)
                                                         :membership/role            "admin"}] nil)]
                          {:ok         true
                           :account-id (first account-eids)
                           :org-id     (first org-eids)})
                result))))

(defn- handle-sign-in! [core storage data env]
  (js-await [db-user       (fetch-account storage (:user data))
             provided-hash (hash-password (:password data) (aget env "JWT_SECRET"))]
            (let [result ((:process core) {:command       :user-sign-in
                                           :data          data
                                           :db-user       db-user
                                           :provided-hash provided-hash})]
              (if (= :sign-in-ok (:action result))
                (js-await [membership (fetch-membership storage (get-in result [:user :id]))]
                          (let [org-id   (:membership/organization-id membership)
                                role     (:membership/role membership)
                                sections (:membership/sections membership)]
                            (js-await [org ((:pull storage) org-id '[*])]
                                      (let [plan         (:organization/plan org)
                                            now          (.now js/Date)
                                            needs-trial? (and (nil? plan)
                                                              (nil? (:organization/trial-started-at org)))]
                                        (js-await [_ (if needs-trial?
                                                       ((:transact! storage)
                                                        [{:db/id                         org-id
                                                          :organization/trial-started-at now
                                                          :organization/trial-elapsed-ms 0
                                                          :organization/trial-resumed-at now
                                                          :organization/trial-paused     false
                                                          :organization/trial-history    (.stringify js/JSON #js [#js {:type "start" :ts now}])}] nil)
                                                       (js/Promise.resolve nil))
                                                   final-org (if needs-trial?
                                                               ((:pull storage) org-id '[*])
                                                               (js/Promise.resolve org))]
                                                  (let [trial       (when (nil? plan) (compute-trial final-org))
                                                        email       (get-in result [:user :email])
                                                        super-email (aget env "SUPER_ADMIN_EMAIL")
                                                        superadmin? (and (some? super-email) (= email super-email))
                                                        claims      (cond-> #js {:email   email
                                                                                  :user-id (get-in result [:user :id])
                                                                                  :org-id  org-id
                                                                                  :role    role
                                                                                  :exp     (+ (js/Math.floor (/ (.now js/Date) 1000)) 86400)}
                                                                       sections    (doto (aset "sections" sections))
                                                                       superadmin? (doto (aset "superadmin" true))
                                                                       plan        (doto (aset "plan" plan))
                                                                       (and (some? trial) (not= "expired" (:status trial)))
                                                                       (doto (aset "trialExpiresAt" (+ (.now js/Date) (* (:days-remaining trial) 86400000.0)))))
                                                        token       (jwt/sign claims (aget env "JWT_SECRET"))]
                                                    {:token token
                                                     :user  (cond-> (assoc (:user result)
                                                                           :org-id   org-id
                                                                           :role     role
                                                                           :sections sections
                                                                           :plan     plan)
                                                              superadmin? (assoc :superadmin true)
                                                              trial       (assoc :trial trial))}))))))
                result))))

(defn- handle-activate-plan! [storage data user]
  (with-org user
    (fn [org-id]
      (js-await [_ ((:transact! storage)
                    [{:db/id             org-id
                      :organization/plan (:tier data)}] nil)]
                {:ok true :plan (:tier data)}))))

;; ---------------------------------------------------------------------------
;; Property handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-properties! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids       ((:find-by-attr storage) :property/organization-id org-id)
                 properties (pull-many+ storage eids '[*])]
                {:properties properties}))))

(defn- handle-create-property! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [result ((:process core) {:command :create-property :data data})]
        (if (:error result)
          result
          (let [{:keys [name address city postal-code country units
                        acquisition-date purchase-price current-value
                        land-value building-value ownership-share
                        living-area-m2 rental-area-m2 year-built usage]} (:entity result)]
            (js-await [dups ((:q storage) {:where [['?e :property/organization-id org-id]
                                                    ['?e :property/name name]]})]
                      (if (seq dups)
                        {:error :duplicate-name}
                        (js-await [{:keys [tx-id entity-ids]}
                                   ((:transact! storage)
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
                                       usage           (assoc :property/usage usage))] nil)]
                                  {:tx-id tx-id :property-id (first entity-ids)})))))))))

(defn- handle-update-property! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:property/organization-id entity) org-id)
                    {:error :not-found}
                    (let [result ((:process core) {:command :update-property :data data})]
                      (if (:error result)
                        result
                        (let [{:keys [name address city postal-code country units
                                      purchase-price current-value iban bank-name landlord-name landlord-street landlord-postal-city
                                      acquisition-date land-value building-value ownership-share
                                      living-area-m2 rental-area-m2 year-built usage]} (:updates result)]
                          (js-await [dups ((:q storage) {:where [['?e :property/organization-id org-id]
                                                                   ['?e :property/name name]]})]
                                    (let [conflicts (filter #(not= % eid) (vec dups))]
                                      (if (seq conflicts)
                                        {:error :duplicate-name}
                                        (js-await [{:keys [tx-id]}
                                                   ((:transact! storage)
                                                    [(cond-> {:db/id eid}
                                                       (some? name)                 (assoc :property/name                 name)
                                                       (some? address)              (assoc :property/address              address)
                                                       (some? city)                 (assoc :property/city                 city)
                                                       (some? postal-code)          (assoc :property/postal-code          postal-code)
                                                       (some? country)              (assoc :property/country              country)
                                                       (some? units)                (assoc :property/units                units)
                                                       (some? purchase-price)       (assoc :property/purchase-price       purchase-price)
                                                       (some? current-value)        (assoc :property/current-value        current-value)
                                                       (some? iban)                 (assoc :property/iban                 iban)
                                                       (some? bank-name)            (assoc :property/bank-name            bank-name)
                                                       (some? landlord-name)        (assoc :property/landlord-name        landlord-name)
                                                       (some? landlord-street)      (assoc :property/landlord-street      landlord-street)
                                                       (some? landlord-postal-city) (assoc :property/landlord-postal-city landlord-postal-city)
                                                       (some? acquisition-date)     (assoc :property/acquisition-date     acquisition-date)
                                                       (some? land-value)           (assoc :property/land-value           land-value)
                                                       (some? building-value)       (assoc :property/building-value       building-value)
                                                       (some? ownership-share)      (assoc :property/ownership-share      ownership-share)
                                                       (some? living-area-m2)       (assoc :property/living-area-m2       living-area-m2)
                                                       (some? rental-area-m2)       (assoc :property/rental-area-m2       rental-area-m2)
                                                       (some? year-built)           (assoc :property/year-built           year-built)
                                                       (some? usage)                (assoc :property/usage                usage))] nil)]
                                                  {:tx-id tx-id})))))))))))))

(defn- handle-delete-property! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:property/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Apartment handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-apartments! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids       ((:find-by-attr storage) :apartment/organization-id org-id)
                 apartments (pull-many+ storage eids '[*])]
                {:apartments apartments}))))

(defn- handle-get-apartments-by-property! [storage data user]
  (with-org user
    (fn [org-id]
      (let [property-id (:property-id data)]
        (js-await [eids       ((:q storage) {:where [['?e :apartment/property-id property-id]
                                                      ['?e :apartment/organization-id org-id]]})
                   apartments (pull-many+ storage (vec eids) '[*])]
                  {:apartments apartments})))))

(defn- handle-create-apartment! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [result ((:process core) {:command :create-apartment :data data})]
        (if (:error result)
          result
          (let [{:keys [property-id code]} (:entity result)]
            (js-await [dups ((:q storage) {:where [['?e :apartment/property-id property-id]
                                                    ['?e :apartment/code code]]})]
                      (if (seq dups)
                        {:error :duplicate-code}
                        (js-await [{:keys [tx-id entity-ids]}
                                   ((:transact! storage)
                                    [(cond-> {:db/type                   "apartment"
                                              :apartment/organization-id org-id
                                              :apartment/property-id     property-id
                                              :apartment/code            code
                                              :apartment/occupied        false}
                                       (some? (:wohnflaeche (:entity result)))
                                       (assoc :apartment/wohnflaeche (js/parseFloat (str (:wohnflaeche (:entity result)))))
                                       (some? (:market-rent (:entity result)))
                                       (assoc :apartment/market-rent (js/parseFloat (str (:market-rent (:entity result)))))
                                       (some? (:strom-zaehler-nr (:entity result)))
                                       (assoc :apartment/strom-zaehler-nr (:strom-zaehler-nr (:entity result)))
                                       (some? (:wasser-zaehler-nrn (:entity result)))
                                       (assoc :apartment/wasser-zaehler-nrn (vec (:wasser-zaehler-nrn (:entity result)))))] nil)]
                                  {:tx-id tx-id :apartment-id (first entity-ids)})))))))))

(defn- handle-update-apartment! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:apartment/organization-id entity) org-id)
                    {:error :not-found}
                    (let [result ((:process core) {:command :update-apartment :data data})]
                      (if (:error result)
                        result
                        (let [{:keys [code occupied wohnflaeche market-rent strom-zaehler-nr wasser-zaehler-nrn]} (:updates result)
                              facts (cond-> {:db/id eid}
                                      (some? code)        (assoc :apartment/code code)
                                      (some? occupied)    (assoc :apartment/occupied (boolean occupied))
                                      (some? wohnflaeche) (assoc :apartment/wohnflaeche (js/parseFloat (str wohnflaeche)))
                                      (some? market-rent) (assoc :apartment/market-rent (js/parseFloat (str market-rent)))
                                      (some? strom-zaehler-nr)   (assoc :apartment/strom-zaehler-nr strom-zaehler-nr)
                                      (some? wasser-zaehler-nrn) (assoc :apartment/wasser-zaehler-nrn (vec wasser-zaehler-nrn)))]
                          (js-await [{:keys [tx-id]}
                                     ((:transact! storage)
                                      [facts] nil)]
                                    {:tx-id tx-id}))))))))))

(defn- handle-delete-apartment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:apartment/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

(defn- handle-get-onboardings! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids        ((:find-by-attr storage) :onboarding/organization-id org-id)
                 onboardings (pull-many+ storage eids '[*])]
                {:onboardings onboardings}))))

(defn- handle-get-onboarding! [storage data user]
  (with-org user
    (fn [org-id]
      (let [apartment-id (:apartment-id data)]
        (js-await [eids ((:q storage) {:where [['?e :onboarding/apartment-id apartment-id]
                                                ['?e :onboarding/organization-id org-id]]})]
                  (if-let [eid (first eids)]
                    (js-await [onboarding ((:pull storage) eid '*)]
                              {:onboarding onboarding})
                    {:onboarding nil}))))))

(defn- handle-start-onboarding! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [result ((:process core) {:command :start-onboarding :data data})]
        (if (:error result)
          result
          (let [{:keys [apartment-id email]} (:entity result)]
            (js-await [{:keys [tx-id entity-ids]}
                       ((:transact! storage)
                        [{:db/type                    "onboarding"
                          :onboarding/organization-id org-id
                          :onboarding/apartment-id    apartment-id
                          :onboarding/email           email
                          :onboarding/status          "pending"}] nil)]
                      {:tx-id tx-id :onboarding-id (first entity-ids)})))))))

;; ---------------------------------------------------------------------------
;; Tenant handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-tenants! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids    ((:find-by-attr storage) :tenant/organization-id org-id)
                 tenants (pull-many+ storage eids '[*])]
                {:tenants tenants}))))

(defn- handle-get-tenants-by-apartment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [apartment-id (:apartment-id data)]
        (js-await [eids    ((:q storage) {:where [['?e :tenant/apartment-id apartment-id]
                                                   ['?e :tenant/organization-id org-id]]})
                   tenants (pull-many+ storage (vec eids) '[*])]
                  {:tenants tenants})))))

(defn- handle-create-tenant! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [result ((:process core) {:command :create-tenant :data data})]
        (if (:error result)
          result
          (let [{:keys [apartment-id first-name last-name email phone start-date end-date birthday household-members]} (:entity result)
                {:keys [kaltmiete nebenkosten-warm residents-count]} data
                miete-year (if (seq start-date)
                             (js/parseInt (.substring start-date 0 4))
                             (.getFullYear (js/Date.)))]
            (js-await [dups ((:q storage) {:where [['?e :tenant/organization-id org-id]
                                                    ['?e :tenant/first-name first-name]
                                                    ['?e :tenant/last-name last-name]]})]
                      (if (seq dups)
                        {:error :duplicate-name}
                        (let [do-transact!
                              (fn []
                                (js-await [{:keys [tx-id entity-ids]}
                                           ((:transact! storage)
                                            [(cond-> {:db/type                  "tenant"
                                                      :tenant/organization-id   org-id
                                                      :tenant/first-name        first-name
                                                      :tenant/last-name         last-name
                                                      :tenant/email             email
                                                      :tenant/phone             phone
                                                      :tenant/start-date        start-date
                                                      :tenant/end-date          end-date
                                                      :tenant/birthday          birthday
                                                      :tenant/household-members household-members}
                                               apartment-id             (assoc :tenant/apartment-id apartment-id)
                                               (some? kaltmiete)        (assoc :tenant/kaltmiete kaltmiete)
                                               (some? nebenkosten-warm) (assoc :tenant/nebenkosten-warm nebenkosten-warm)
                                               (some? residents-count)  (assoc :tenant/residents-count residents-count))] nil)]
                                          (let [tenant-id (first entity-ids)]
                                            (if (or (some? kaltmiete) (some? nebenkosten-warm))
                                              (js-await [_ ((:transact! storage)
                                                            [(cond-> {:db/type                      "tenant-miete"
                                                                      :tenant-miete/organization-id org-id
                                                                      :tenant-miete/tenant-id       tenant-id
                                                                      :tenant-miete/year            miete-year}
                                                               (some? kaltmiete)        (assoc :tenant-miete/kaltmiete kaltmiete)
                                                               (some? nebenkosten-warm) (assoc :tenant-miete/nebenkosten-warm nebenkosten-warm))] nil)]
                                                       {:tx-id tx-id :tenant-id tenant-id})
                                              {:tx-id tx-id :tenant-id tenant-id}))))]
                          (if (and apartment-id (seq start-date))
                            (js-await [apt-eids ((:q storage) {:where [['?e :tenant/apartment-id apartment-id]
                                                                         ['?e :tenant/organization-id org-id]]})
                                       apt-tenants (pull-many+ storage (vec apt-eids) '[*])]
                                      (if (some #(dates-overlap? start-date end-date
                                                                  (:tenant/start-date %)
                                                                  (:tenant/end-date %))
                                                apt-tenants)
                                        {:error :date-overlap}
                                        (do-transact!)))
                            (do-transact!)))))))))))

(defn- handle-update-tenant! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:tenant/organization-id entity) org-id)
                    {:error :not-found}
                    (let [result ((:process core) {:command :update-tenant :data data})]
                      (if (:error result)
                        result
                        (let [{:keys [first-name last-name email phone start-date end-date birthday household-members residents-count kaltmiete nebenkosten-warm]} (:updates result)
                              facts (cond-> {:db/id eid}
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
                                      (some? nebenkosten-warm)  (assoc :tenant/nebenkosten-warm nebenkosten-warm))]
                          (js-await [{:keys [tx-id]}
                                     ((:transact! storage)
                                      [facts] nil)]
                                    {:tx-id tx-id}))))))))))

(defn- handle-delete-tenant! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:tenant/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Cost handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-costs! [storage data user]
  (with-org user
    (fn [org-id]
      (let [property-id (:property-id data)]
        (js-await [eids  ((:q storage) {:where [['?e :cost/property-id    property-id]
                                                  ['?e :cost/organization-id org-id]]})
                   costs (pull-many+ storage (vec eids) '[*])]
                  {:costs costs})))))

(defn- handle-create-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [property-id line name year value source-file recorded-at]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type              "cost"
                               :cost/organization-id  org-id
                               :cost/property-id      property-id
                               :cost/line             line
                               :cost/name             name
                               :cost/year             year
                               :cost/value            value}
                       (some? source-file) (assoc :cost/source-file source-file)
                       (some? recorded-at) (assoc :cost/recorded-at recorded-at))] nil)]
                  {:tx-id tx-id :cost-id (first entity-ids)})))))

(defn- handle-update-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:cost/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [{:db/id      eid
                                  :cost/value (:value data)}] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:cost/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Rent-payment handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-rent-payments! [storage data user]
  (with-org user
    (fn [org-id]
      (let [apartment-id (:apartment-id data)]
        (js-await [eids  ((:q storage) {:where [['?e :rent-payment/apartment-id    apartment-id]
                                                  ['?e :rent-payment/organization-id org-id]]})
                   rents (pull-many+ storage (vec eids) '[*])]
                  {:rent-payments rents})))))

(defn- handle-create-rent-payment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [apartment-id year month value kaltmiete nebenkosten-warm date description
                    payment-type source-file recorded-at]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                      "rent-payment"
                               :rent-payment/organization-id  org-id
                               :rent-payment/apartment-id     apartment-id
                               :rent-payment/year             year
                               :rent-payment/month            month
                               :rent-payment/value            value
                               :rent-payment/date             date
                               :rent-payment/description      description}
                       (some? kaltmiete)        (assoc :rent-payment/kaltmiete kaltmiete)
                       (some? nebenkosten-warm) (assoc :rent-payment/nebenkosten-warm nebenkosten-warm)
                       (some? payment-type)     (assoc :rent-payment/payment-type payment-type)
                       (some? source-file)      (assoc :rent-payment/source-file source-file)
                       (some? recorded-at)      (assoc :rent-payment/recorded-at recorded-at))] nil)]
                  {:tx-id tx-id :rent-payment-id (first entity-ids)})))))

(defn- handle-update-rent-payment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:rent-payment/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id              eid
                                          :rent-payment/value (:value data)}
                                   (some? (:kaltmiete data))        (assoc :rent-payment/kaltmiete (:kaltmiete data))
                                   (some? (:nebenkosten-warm data)) (assoc :rent-payment/nebenkosten-warm (:nebenkosten-warm data)))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-rent-payment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:rent-payment/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Apartment-cost handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-apartment-costs! [storage data user]
  (with-org user
    (fn [org-id]
      (let [apartment-id (:apartment-id data)]
        (js-await [eids  ((:q storage) {:where [['?e :apartment-cost/apartment-id    apartment-id]
                                                  ['?e :apartment-cost/organization-id org-id]]})
                   costs (pull-many+ storage (vec eids) '[*])]
                  {:costs costs})))))

(defn- handle-create-apartment-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [apartment-id line name year value verteiler anteil schluessel]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                        "apartment-cost"
                              :apartment-cost/organization-id org-id
                              :apartment-cost/apartment-id    apartment-id
                              :apartment-cost/line            line
                              :apartment-cost/name            name
                              :apartment-cost/year            year
                              :apartment-cost/value           value}
                       verteiler  (assoc :apartment-cost/verteiler  verteiler)
                       anteil     (assoc :apartment-cost/anteil     anteil)
                       schluessel (assoc :apartment-cost/schluessel schluessel))] nil)]
                  {:tx-id tx-id :cost-id (first entity-ids)})))))

(defn- handle-update-apartment-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:apartment-cost/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id eid}
                                   (some? (:value     data)) (assoc :apartment-cost/value     (:value     data))
                                   (some? (:verteiler data)) (assoc :apartment-cost/verteiler (:verteiler data))
                                   (some? (:anteil    data)) (assoc :apartment-cost/anteil    (:anteil    data))
                                   (some? (:schluessel data)) (assoc :apartment-cost/schluessel (:schluessel data)))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-apartment-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:apartment-cost/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Expense-type handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-expense-types! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [org-eids      ((:find-by-attr storage) :expense-type/organization-id org-id)
                 sys-eids      ((:find-by-attr storage) :expense-type/organization-id "system")
                 expense-types (pull-many+ storage (vec (distinct (concat sys-eids org-eids))) '[*])]
                {:expense-types expense-types}))))

(defn- handle-create-expense-type! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [key name-en name-de distribution-method]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type                          "expense-type"
                      :expense-type/organization-id     org-id
                      :expense-type/key                 key
                      :expense-type/name-en             name-en
                      :expense-type/name-de             name-de
                      :expense-type/distribution-method (or distribution-method "living-area")}] nil)]
                  {:tx-id tx-id :expense-type-id (first entity-ids)})))))

(defn- handle-update-expense-type! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not (contains? #{org-id "system"} (:expense-type/organization-id entity)))
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id eid}
                                   (:name-en data)             (assoc :expense-type/name-en             (:name-en data))
                                   (:name-de data)             (assoc :expense-type/name-de             (:name-de data))
                                   (:distribution-method data) (assoc :expense-type/distribution-method (:distribution-method data)))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-expense-type! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:expense-type/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

(defn- handle-get-all-costs! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids  ((:find-by-attr storage) :cost/organization-id org-id)
                 costs (pull-many+ storage eids '[*])]
                {:costs costs}))))

(defn- handle-get-all-apartment-costs! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids  ((:find-by-attr storage) :apartment-cost/organization-id org-id)
                 costs (pull-many+ storage eids '[*])]
                {:costs costs}))))

(defn- handle-get-all-rent-payments! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids  ((:find-by-attr storage) :rent-payment/organization-id org-id)
                 rents (pull-many+ storage eids '[*])]
                {:rent-payments rents}))))

;; ---------------------------------------------------------------------------
;; Tenant-Miete handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-all-tenant-mieten! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids   ((:find-by-attr storage) :tenant-miete/organization-id org-id)
                 mieten (pull-many+ storage eids '[*])]
                {:tenant-mieten mieten}))))

(defn- handle-upsert-tenant-miete! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [tenant-id year kaltmiete nebenkosten-warm]} data]
        (js-await [eids ((:q storage) {:where [['?e :tenant-miete/tenant-id tenant-id]
                                               ['?e :tenant-miete/year year]
                                               ['?e :tenant-miete/organization-id org-id]]})]
                  (let [eid (or (first eids) (str (random-uuid)))]
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id                        eid
                                          :db/type                      "tenant-miete"
                                          :tenant-miete/organization-id org-id
                                          :tenant-miete/tenant-id       tenant-id
                                          :tenant-miete/year            year}
                                   (some? kaltmiete)        (assoc :tenant-miete/kaltmiete kaltmiete)
                                   (some? nebenkosten-warm) (assoc :tenant-miete/nebenkosten-warm nebenkosten-warm))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-tenant-miete! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:tenant-miete/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

(defn- handle-get-all-garages! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids   ((:find-by-attr storage) :garage/organization-id org-id)
                 garages (pull-many+ storage eids '[*])]
                {:garages garages}))))

(defn- handle-create-garage! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [result ((:process core) {:command :create-garage :data data})]
        (if (:error result)
          result
          (let [{:keys [property-id code flaeche monthly-rent]} (:entity result)
                tenant-id (:tenant-id data)]
            (js-await [{:keys [entity-ids]}
                       ((:transact! storage)
                        [(cond-> {:db/type                "garage"
                                  :garage/organization-id org-id
                                  :garage/property-id     property-id
                                  :garage/code            code
                                  :garage/occupied        (boolean tenant-id)}
                           (some? flaeche)      (assoc :garage/flaeche (js/parseFloat (str flaeche)))
                           (some? monthly-rent) (assoc :garage/monthly-rent (js/parseFloat (str monthly-rent)))
                           (some? tenant-id)    (assoc :garage/tenant-id tenant-id))]
                        nil)]
                      {:garage-id (first entity-ids)})))))))

(defn- handle-assign-tenant-to-garage! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [tenant-id garage-id]} data]
        (js-await [garage ((:pull storage) garage-id '*)]
                  (if (not= (:garage/organization-id garage) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [{:db/id            garage-id
                                  :garage/tenant-id  tenant-id
                                  :garage/occupied   true}]
                                nil)]
                              {:tx-id tx-id})))))))

(defn- handle-unassign-tenant-from-garage! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [garage-id]} data]
        (js-await [garage ((:pull storage) garage-id '*)]
                  (if (not= (:garage/organization-id garage) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [{:db/id            garage-id
                                  :garage/tenant-id  nil
                                  :garage/occupied   false}]
                                nil)]
                              {:tx-id tx-id})))))))

(defn- handle-update-garage! [core storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:garage/organization-id entity) org-id)
                    {:error :not-found}
                    (let [result ((:process core) {:command :update-garage :data data})]
                      (if (:error result)
                        result
                        (let [{:keys [code occupied flaeche monthly-rent]} (:updates result)
                              facts (cond-> {:db/id eid}
                                      (some? code)         (assoc :garage/code code)
                                      (some? occupied)     (assoc :garage/occupied (boolean occupied))
                                      (some? flaeche)      (assoc :garage/flaeche (js/parseFloat (str flaeche)))
                                      (some? monthly-rent) (assoc :garage/monthly-rent (js/parseFloat (str monthly-rent))))]
                          (js-await [{:keys [tx-id]}
                                     ((:transact! storage) [facts] nil)]
                                    {:tx-id tx-id}))))))))))

(defn- handle-delete-garage! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:garage/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

(defn- handle-assign-tenant-to-apartment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [tenant-id apartment-id]} data]
        (js-await [tenant ((:pull storage) tenant-id '*)]
                  (if (not= (:tenant/organization-id tenant) org-id)
                    {:error :not-found}
                    (js-await [apartment ((:pull storage) apartment-id '*)]
                              (if (not= (:apartment/organization-id apartment) org-id)
                                {:error :not-found}
                                (js-await [{:keys [tx-id]}
                                           ((:transact! storage)
                                            [{:db/id               tenant-id
                                              :tenant/apartment-id  apartment-id}
                                             {:db/id               apartment-id
                                              :apartment/occupied   true}] nil)]
                                          {:tx-id tx-id})))))))))

;; ---------------------------------------------------------------------------
;; Survey handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-survey-questions! [storage]
  (js-await [eids      ((:find-by-type storage) "survey-question")
             questions (pull-many+ storage eids '[*])]
            {:questions (sort-by :question/order questions)}))

(defn- handle-submit-survey! [storage data]
  (let [{:keys [email responses]} data]
    (js-await [_ ((:transact! storage)
                  [{:db/type           "survey-response"
                    :response/email    email
                    :response/answers  (js/JSON.stringify (clj->js responses))}] nil)]
              {:ok true})))

;; ---------------------------------------------------------------------------
;; Property Tax Config handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-property-tax-configs! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids    ((:find-by-attr storage) :property-tax-config/organization-id org-id)
                 configs (pull-many+ storage eids '[*])]
                {:property-tax-configs configs}))))

(defn- handle-upsert-property-tax-config! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [property-id land-value building-value afa-rate afa-start-date]} data]
        (js-await [eids ((:q storage) {:where [['?e :property-tax-config/property-id     property-id]
                                               ['?e :property-tax-config/organization-id org-id]]})]
                  (let [eid (or (first eids) (str (random-uuid)))]
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id                               eid
                                          :db/type                             "property-tax-config"
                                          :property-tax-config/organization-id org-id
                                          :property-tax-config/property-id     property-id
                                          :property-tax-config/land-value      land-value
                                          :property-tax-config/building-value  building-value
                                          :property-tax-config/afa-rate        afa-rate}
                                   afa-start-date (assoc :property-tax-config/afa-start-date afa-start-date))] nil)]
                              {:tx-id tx-id})))))))

;; ---------------------------------------------------------------------------
;; Property Loan handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-property-loans! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids  ((:find-by-attr storage) :property-loan/organization-id org-id)
                 loans (pull-many+ storage eids '[*])]
                {:property-loans loans}))))

(defn- handle-create-property-loan! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [property-id year lender-name annual-interest notes]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                      "property-loan"
                              :property-loan/organization-id org-id
                              :property-loan/property-id    property-id
                              :property-loan/year           year
                              :property-loan/annual-interest annual-interest}
                       lender-name (assoc :property-loan/lender-name lender-name)
                       notes       (assoc :property-loan/notes notes))] nil)]
                  {:tx-id tx-id :loan-id (first entity-ids)})))))

(defn- handle-update-property-loan! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:property-loan/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id eid}
                                   (some? (:year data))             (assoc :property-loan/year             (:year data))
                                   (some? (:annual-interest data))  (assoc :property-loan/annual-interest  (:annual-interest data))
                                   (some? (:lender-name data))      (assoc :property-loan/lender-name      (:lender-name data))
                                   (some? (:notes data))            (assoc :property-loan/notes            (:notes data)))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-property-loan! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:property-loan/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Property Maintenance (Erhaltungsaufwand) handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-property-maintenances! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids         ((:find-by-attr storage) :property-maintenance/organization-id org-id)
                 maintenances (pull-many+ storage eids '[*])]
                {:property-maintenances maintenances}))))

(defn- handle-create-property-maintenance! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [property-id year description amount spread-years]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                              "property-maintenance"
                              :property-maintenance/organization-id org-id
                              :property-maintenance/property-id     property-id
                              :property-maintenance/year            year
                              :property-maintenance/amount          amount
                              :property-maintenance/spread-years    (or spread-years 1)}
                       description (assoc :property-maintenance/description description))] nil)]
                  {:tx-id tx-id :maintenance-id (first entity-ids)})))))

(defn- handle-update-property-maintenance! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:property-maintenance/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id eid}
                                   (some? (:year data))         (assoc :property-maintenance/year         (:year data))
                                   (some? (:amount data))       (assoc :property-maintenance/amount       (:amount data))
                                   (some? (:spread-years data)) (assoc :property-maintenance/spread-years (:spread-years data))
                                   (some? (:description data))  (assoc :property-maintenance/description  (:description data)))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-property-maintenance! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:property-maintenance/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Date-range helpers
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

;; ---------------------------------------------------------------------------
;; Org user management handlers
;; ---------------------------------------------------------------------------

(defn- org-admin-guard
  "Guards a handler that requires the authenticated user to be an org admin (role=admin)."
  [user f]
  (if (= "admin" (:role user))
    (with-org user f)
    {:error :forbidden}))

(defn- handle-list-org-users! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [membership-eids ((:find-by-attr storage) :membership/organization-id org-id)
                 memberships     (pull-many+ storage membership-eids '[*])]
                (if (empty? memberships)
                  {:users []}
                  (let [account-eids (mapv :membership/account-id memberships)]
                    (js-await [accounts (pull-many+ storage account-eids '[*])]
                              (let [accounts-by-id (into {} (map (fn [a] [(:db/id a) a]) accounts))]
                                {:users (mapv (fn [m]
                                               (let [a (get accounts-by-id (:membership/account-id m))]
                                                 {:id            (:membership/account-id m)
                                                  :membership-id (:db/id m)
                                                  :email         (:account/email a)
                                                  :name          (:account/name a)
                                                  :role          (:membership/role m)
                                                  :sections      (:membership/sections m)}))
                                             memberships)}))))))))

(defn- handle-create-org-user! [storage data user env]
  (org-admin-guard user
    (fn [org-id]
      (let [{:keys [email name password sections]} data]
        (js-await [existing (fetch-account storage email)]
                  (if existing
                    {:error :email-taken}
                    (js-await [hashed                    (hash-password password (aget env "JWT_SECRET"))
                               {account-eids :entity-ids} ((:transact! storage)
                                                             [{:db/type          "account"
                                                               :account/email    email
                                                               :account/name     name
                                                               :account/password hashed
                                                               :account/verified true
                                                               :account/plan     nil}] nil)
                               _                          ((:transact! storage)
                                                           [(cond-> {:db/type                    "membership"
                                                                     :membership/account-id      (first account-eids)
                                                                     :membership/organization-id org-id
                                                                     :membership/role            "member"}
                                                              (seq sections) (assoc :membership/sections (str/join "," sections)))] nil)]
                             {:ok true :account-id (first account-eids)})))))))

(defn- handle-update-org-user-sections! [storage data user]
  (org-admin-guard user
    (fn [org-id]
      (let [{:keys [membership-id sections]} data]
        (js-await [membership ((:pull storage) membership-id '[*])]
                  (if (not= org-id (:membership/organization-id membership))
                    {:error :forbidden}
                    (js-await [_ ((:transact! storage)
                                  [{:db/id               membership-id
                                    :membership/sections (str/join "," sections)}] nil)]
                              {:ok true})))))))

(defn- handle-delete-org-user! [storage data user]
  (org-admin-guard user
    (fn [org-id]
      (let [{:keys [account-id membership-id]} data]
        (if (= account-id (:user-id user))
          {:error :cannot-delete-self}
          (js-await [membership ((:pull storage) membership-id '[*])]
                    (if (not= org-id (:membership/organization-id membership))
                      {:error :forbidden}
                      (js-await [_ ((:transact! storage)
                                    [[:db/retractEntity account-id]
                                     [:db/retractEntity membership-id]] nil)]
                                {:ok true}))))))))

;; ---------------------------------------------------------------------------
;; Trial handlers
;; ---------------------------------------------------------------------------

(defn- handle-pause-trial! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [org ((:pull storage) org-id '[*])]
                (let [trial (compute-trial org)]
                  (if (= "active" (:status trial))
                    (let [now        (.now js/Date)
                          history    (try (js/JSON.parse (or (:organization/trial-history org) "[]"))
                                          (catch :default _ #js []))
                          new-hist   (.stringify js/JSON (.concat history #js [#js {:type "pause" :ts now}]))
                          elapsed-ms (or (:organization/trial-elapsed-ms org) 0)
                          resumed-at (:organization/trial-resumed-at org)
                          new-elapsed (+ elapsed-ms (if (and (number? resumed-at) (pos? resumed-at))
                                                      (max 0 (- now resumed-at)) 0))]
                      (js-await [_ ((:transact! storage)
                                    [{:db/id                         org-id
                                      :organization/trial-paused     true
                                      :organization/trial-elapsed-ms new-elapsed
                                      :organization/trial-history    new-hist}] nil)]
                                (let [updated-org (assoc org
                                                         :organization/trial-paused true
                                                         :organization/trial-elapsed-ms new-elapsed)]
                                  {:ok true :trial (compute-trial updated-org)})))
                    {:error :trial-not-active}))))))

(defn- handle-resume-trial! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [org ((:pull storage) org-id '[*])]
                (let [trial (compute-trial org)]
                  (if (= "paused" (:status trial))
                    (let [now      (.now js/Date)
                          history  (try (js/JSON.parse (or (:organization/trial-history org) "[]"))
                                        (catch :default _ #js []))
                          new-hist (.stringify js/JSON (.concat history #js [#js {:type "resume" :ts now}]))]
                      (js-await [_ ((:transact! storage)
                                    [{:db/id                         org-id
                                      :organization/trial-paused     false
                                      :organization/trial-resumed-at now
                                      :organization/trial-history    new-hist}] nil)]
                                (let [updated-org (assoc org
                                                         :organization/trial-paused false
                                                         :organization/trial-resumed-at now)]
                                  {:ok true :trial (compute-trial updated-org)})))
                    {:error :trial-not-paused}))))))

;; ---------------------------------------------------------------------------
;; Admin handlers
;; ---------------------------------------------------------------------------

(defn- admin-guard [user f]
  (if (:superadmin user)
    (f)
    {:error :forbidden}))

(defn- handle-admin-pause-trial! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email]} data]
        (js-await [account-eids ((:find-by-attr storage) :account/email email)]
                  (if-let [account-eid (first account-eids)]
                    (js-await [membership (fetch-membership storage account-eid)]
                              (if membership
                                (let [org-id (:membership/organization-id membership)]
                                  (handle-pause-trial! storage {:org-id org-id}))
                                {:error :not-found}))
                    {:error :not-found}))))))

(defn- handle-admin-resume-trial! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email]} data]
        (js-await [account-eids ((:find-by-attr storage) :account/email email)]
                  (if-let [account-eid (first account-eids)]
                    (js-await [membership (fetch-membership storage account-eid)]
                              (if membership
                                (let [org-id (:membership/organization-id membership)]
                                  (handle-resume-trial! storage {:org-id org-id}))
                                {:error :not-found}))
                    {:error :not-found}))))))

(defn- handle-admin-list-users! [storage user]
  (admin-guard user
    (fn []
      (js-await [account-eids ((:find-by-type storage) "account")
                 accounts     (pull-many+ storage account-eids '[*])
                 mem-eids     ((:find-by-type storage) "membership")
                 memberships  (pull-many+ storage mem-eids '[*])]
                (let [acct->org-id (into {} (map (fn [m] [(:membership/account-id m) (:membership/organization-id m)]) memberships))
                      org-ids      (vec (distinct (remove nil? (vals acct->org-id))))]
                  (js-await [orgs (pull-many+ storage org-ids '[*])]
                            (let [org-id->org  (into {} (map (fn [o] [(:db/id o) o]) orgs))
                                  org-id->plan (into {} (map (fn [o] [(:db/id o) (:organization/plan o)]) orgs))]
                              {:users (mapv (fn [a]
                                             (let [org-id (get acct->org-id (:db/id a))
                                                   org    (get org-id->org org-id)]
                                               {:id    (:db/id a)
                                                :email (:account/email a)
                                                :name  (:account/name a)
                                                :plan  (get org-id->plan org-id)
                                                :trial (when org (compute-trial org))}))
                                           accounts)})))))))

(defn- handle-admin-set-plan! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email tier]} data]
        (js-await [eids ((:find-by-attr storage) :account/email email)]
                  (if-let [account-eid (first eids)]
                    (js-await [membership (fetch-membership storage account-eid)]
                              (if membership
                                (js-await [_ ((:transact! storage)
                                              [{:db/id             (:membership/organization-id membership)
                                                :organization/plan tier}] nil)]
                                          {:ok true :email email :plan tier})
                                {:error :not-found}))
                    {:error :not-found}))))))

(defn- handle-admin-create-question! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [text order]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type          "survey-question"
                      :question/text   text
                      :question/order  (or order 0)}] nil)]
                  {:tx-id tx-id :question-id (first entity-ids)})))))

(defn- handle-admin-update-question! [storage data user]
  (admin-guard user
    (fn []
      (let [eid (:id data)]
        (js-await [_ ((:transact! storage)
                      [(cond-> {:db/id eid}
                         (:text data)  (assoc :question/text  (:text data))
                         (:order data) (assoc :question/order (:order data)))] nil)]
                  {:ok true})))))

(defn- handle-admin-delete-question! [storage data user]
  (admin-guard user
    (fn []
      (js-await [_ ((:transact! storage) [[:db/retractEntity (:id data)]] nil)]
                {:ok true}))))

(defn- handle-admin-impersonate! [storage data user env]
  (admin-guard user
    (fn []
      (let [{:keys [email]} data]
        (js-await [target-eids ((:find-by-attr storage) :account/email email)]
                  (if-let [target-eid (first target-eids)]
                    (js-await [target-account    ((:pull storage) target-eid '*)
                               target-membership (fetch-membership storage target-eid)]
                              (if (nil? target-membership)
                                {:error :not-found}
                                (let [org-id (:membership/organization-id target-membership)
                                      role   (:membership/role target-membership)]
                                  (js-await [target-org ((:pull storage) org-id '[*])]
                                            (let [plan   (:organization/plan target-org)
                                                  trial  (when (nil? plan) (compute-trial target-org))
                                                  claims #js {:email           email
                                                              :user-id         target-eid
                                                              :org-id          org-id
                                                              :role            role
                                                              :impersonated-by (:email user)
                                                              :exp             (+ (js/Math.floor (/ (.now js/Date) 1000)) 3600)}
                                                  token  (jwt/sign claims (aget env "JWT_SECRET"))]
                                              {:token token
                                               :user  (cond-> {:email           email
                                                               :name            (:account/name target-account)
                                                               :org-id          org-id
                                                               :role            role
                                                               :plan            plan
                                                               :impersonated-by (:email user)}
                                                        trial (assoc :trial trial))})))))
                    {:error :not-found}))))))

;; ---------------------------------------------------------------------------
;; Admin export / import
;; ---------------------------------------------------------------------------

(defn- handle-admin-export! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email]} data]
        (js-await [account-eids ((:find-by-attr storage) :account/email email)]
                  (if-let [account-eid (first account-eids)]
                    (js-await [target-membership (fetch-membership storage account-eid)]
                              (if (nil? target-membership)
                                {:error :not-found}
                                (let [org-id         (:membership/organization-id target-membership)
                                      membership-eid (:db/id target-membership)]
                                  ((:dump-org storage) org-id account-eid membership-eid))))
                    {:error :not-found}))))))

(defn- handle-admin-import! [storage data user]
  (admin-guard user
    (fn []
      ((:restore-org! storage) data))))

;; ---------------------------------------------------------------------------
;; Dispatcher
;; ---------------------------------------------------------------------------

(defn dispatch [{:keys [core storage command data env user]}]
  (if (and (trial-gated-commands command) (not (trial-access? user)))
    {:error :trial-expired}
    (let [storage (with-impersonation-meta storage user)]
  (case command
    :user-sign-up                    (handle-sign-up! core storage data env)
    :user-sign-in                    (handle-sign-in! core storage data env)
    :get-properties                  (handle-get-properties! storage user)
    :create-property                 (handle-create-property! core storage data user)
    :update-property                 (handle-update-property! core storage data user)
    :delete-property                 (handle-delete-property! storage data user)
    :get-apartments                  (handle-get-apartments! storage user)
    :get-apartments-by-property      (handle-get-apartments-by-property! storage data user)
    :create-apartment                (handle-create-apartment! core storage data user)
    :update-apartment                (handle-update-apartment! core storage data user)
    :delete-apartment                (handle-delete-apartment! storage data user)
    :get-onboardings                 (handle-get-onboardings! storage user)
    :get-onboarding                  (handle-get-onboarding! storage data user)
    :start-onboarding                (handle-start-onboarding! core storage data user)
    :get-tenants                     (handle-get-tenants! storage user)
    :get-tenants-by-apartment        (handle-get-tenants-by-apartment! storage data user)
    :create-tenant                   (handle-create-tenant! core storage data user)
    :update-tenant                   (handle-update-tenant! core storage data user)
    :delete-tenant                   (handle-delete-tenant! storage data user)
    :assign-tenant-to-apartment      (handle-assign-tenant-to-apartment! storage data user)
    :get-rent-payments               (handle-get-rent-payments! storage data user)
    :create-rent-payment             (handle-create-rent-payment! storage data user)
    :update-rent-payment             (handle-update-rent-payment! storage data user)
    :delete-rent-payment             (handle-delete-rent-payment! storage data user)
    :get-apartment-costs             (handle-get-apartment-costs! storage data user)
    :create-apartment-cost           (handle-create-apartment-cost! storage data user)
    :update-apartment-cost           (handle-update-apartment-cost! storage data user)
    :delete-apartment-cost           (handle-delete-apartment-cost! storage data user)
    :get-costs                       (handle-get-costs! storage data user)
    :create-cost                     (handle-create-cost! storage data user)
    :update-cost                     (handle-update-cost! storage data user)
    :delete-cost                     (handle-delete-cost! storage data user)
    :get-expense-types               (handle-get-expense-types! storage user)
    :create-expense-type             (handle-create-expense-type! storage data user)
    :update-expense-type             (handle-update-expense-type! storage data user)
    :delete-expense-type             (handle-delete-expense-type! storage data user)
    :get-all-costs                   (handle-get-all-costs! storage user)
    :get-all-apartment-costs         (handle-get-all-apartment-costs! storage user)
    :get-all-rent-payments           (handle-get-all-rent-payments! storage user)
    :get-all-tenant-mieten           (handle-get-all-tenant-mieten! storage user)
    :upsert-tenant-miete             (handle-upsert-tenant-miete! storage data user)
    :delete-tenant-miete             (handle-delete-tenant-miete! storage data user)
    :get-all-garages                 (handle-get-all-garages! storage user)
    :create-garage                   (handle-create-garage! core storage data user)
    :update-garage                   (handle-update-garage! core storage data user)
    :delete-garage                   (handle-delete-garage! storage data user)
    :assign-tenant-to-garage         (handle-assign-tenant-to-garage! storage data user)
    :unassign-tenant-from-garage     (handle-unassign-tenant-from-garage! storage data user)
    :activate-plan                   (handle-activate-plan! storage data user)
    :list-org-users                  (handle-list-org-users! storage user)
    :create-org-user                 (handle-create-org-user! storage data user env)
    :update-org-user-sections        (handle-update-org-user-sections! storage data user)
    :delete-org-user                 (handle-delete-org-user! storage data user)
    :admin-list-users                (handle-admin-list-users! storage user)
    :admin-set-plan                  (handle-admin-set-plan! storage data user)
    :admin-create-question           (handle-admin-create-question! storage data user)
    :admin-update-question           (handle-admin-update-question! storage data user)
    :admin-delete-question           (handle-admin-delete-question! storage data user)
    :admin-impersonate               (handle-admin-impersonate! storage data user env)
    :admin-export                    (handle-admin-export! storage data user)
    :admin-import                    (handle-admin-import! storage data user)
    :pause-trial                     (handle-pause-trial! storage user)
    :resume-trial                    (handle-resume-trial! storage user)
    :admin-pause-trial               (handle-admin-pause-trial! storage data user)
    :admin-resume-trial              (handle-admin-resume-trial! storage data user)
    :get-survey-questions            (handle-get-survey-questions! storage)
    :submit-survey                   (handle-submit-survey! storage data)
    :get-property-tax-configs        (handle-get-property-tax-configs! storage user)
    :upsert-property-tax-config      (handle-upsert-property-tax-config! storage data user)
    :get-property-loans              (handle-get-property-loans! storage user)
    :create-property-loan            (handle-create-property-loan! storage data user)
    :update-property-loan            (handle-update-property-loan! storage data user)
    :delete-property-loan            (handle-delete-property-loan! storage data user)
    :get-property-maintenances       (handle-get-property-maintenances! storage user)
    :create-property-maintenance     (handle-create-property-maintenance! storage data user)
    :update-property-maintenance     (handle-update-property-maintenance! storage data user)
    :delete-property-maintenance     (handle-delete-property-maintenance! storage data user)
    {:error :unknown-command}))))
