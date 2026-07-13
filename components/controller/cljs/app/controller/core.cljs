(ns app.controller.core
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]
            [app.controller.features :as features]
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
           (> (:trialExpiresAt user) (.now js/Date))
           (not (:trialPaused user)))))

(def ^:private trial-gated-commands
  #{:create-property      :create-apartment         :start-onboarding
    :create-tenant        :assign-tenant-to-apartment
    :create-rent-payment  :create-apartment-cost    :create-cost
    :create-expense-type  :upsert-tenant-miete
    :create-garage        :assign-tenant-to-garage  :create-garage-payment
    :upsert-property-tax-config
    :create-property-loan :create-property-maintenance
    :create-bank-account})

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
         :expires-at     (when (= status "active") (+ now remaining))
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
                                                                       (and (some? trial) (= "active" (:status trial)))
                                                                       (doto (aset "trialExpiresAt" (+ (.now js/Date) (* (:days-remaining trial) 86400000.0))))
                                                                       (and (some? trial) (= "paused" (:status trial)))
                                                                       (doto (aset "trialPaused" true)))
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
                        (let [{:keys [code occupied wohnflaeche market-rent strom-zaehler-nr wasser-zaehler-nrn leerstand]} (:updates result)
                              facts (cond-> {:db/id eid}
                                      (some? code)        (assoc :apartment/code code)
                                      (some? occupied)    (assoc :apartment/occupied (boolean occupied))
                                      (some? wohnflaeche) (assoc :apartment/wohnflaeche (js/parseFloat (str wohnflaeche)))
                                      (some? market-rent) (assoc :apartment/market-rent (js/parseFloat (str market-rent)))
                                      (some? strom-zaehler-nr)   (assoc :apartment/strom-zaehler-nr strom-zaehler-nr)
                                      (some? wasser-zaehler-nrn) (assoc :apartment/wasser-zaehler-nrn (vec wasser-zaehler-nrn))
                                      (some? leerstand)          (assoc :apartment/leerstand (boolean leerstand)))]
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
      (let [{:keys [property-id line name year value source-file recorded-at bank-account-id]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type              "cost"
                               :cost/organization-id  org-id
                               :cost/property-id      property-id
                               :cost/line             line
                               :cost/name             name
                               :cost/year             year
                               :cost/value            value}
                       (some? source-file)     (assoc :cost/source-file source-file)
                       (some? recorded-at)     (assoc :cost/recorded-at recorded-at)
                       (some? bank-account-id) (assoc :cost/bank-account-id bank-account-id))] nil)]
                  {:tx-id tx-id :cost-id (first entity-ids)})))))

(defn- handle-update-cost! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid       (:id data)
            new-value (:value data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:cost/organization-id entity) org-id)
                    {:error :not-found}
                    (let [line (:cost/line entity)
                          year (:cost/year entity)]
                      (js-await [{:keys [tx-id]}
                                 ((:transact! storage)
                                  [{:db/id      eid
                                    :cost/value new-value}] nil)
                                 apt-eids
                                 ((:q storage)
                                  {:where [['?e :apartment-cost/line            line]
                                           ['?e :apartment-cost/year            year]
                                           ['?e :apartment-cost/organization-id org-id]]})
                                 apt-costs
                                 (pull-many+ storage (vec apt-eids) '[*])]
                                (let [txns (into []
                                                 (keep (fn [ac]
                                                         (let [v (:apartment-cost/verteiler ac)
                                                               a (:apartment-cost/anteil    ac)]
                                                           (when (and (some? v) (some? a) (pos? v))
                                                             {:db/id                (:db/id ac)
                                                              :apartment-cost/value (/ (* (double new-value) (double a))
                                                                                       (double v))})))
                                                       apt-costs))]
                                  (if (seq txns)
                                    (js-await [_ ((:transact! storage) txns nil)]
                                              {:tx-id tx-id})
                                    {:tx-id tx-id}))))))))))


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
                    payment-type source-file recorded-at bank-account-id]} data]
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
                       (some? recorded-at)      (assoc :rent-payment/recorded-at recorded-at)
                       (some? bank-account-id)  (assoc :rent-payment/bank-account-id bank-account-id))] nil)]
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
      (let [{:keys [apartment-id line name year value verteiler anteil schluessel tenant-id]} data]
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
                       schluessel (assoc :apartment-cost/schluessel schluessel)
                       tenant-id  (assoc :apartment-cost/tenant-id  tenant-id))] nil)]
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
;; Residents-count-change handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-all-residents-count-changes! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids    ((:find-by-attr storage) :persons-change/organization-id org-id)
                 changes (pull-many+ storage eids '[*])]
                {:residents-count-changes changes}))))

(defn- handle-create-residents-count-change! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [tenant-id apartment-id year from-date count]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type                         "persons-change"
                      :persons-change/organization-id org-id
                      :persons-change/tenant-id       tenant-id
                      :persons-change/apartment-id    apartment-id
                      :persons-change/year            year
                      :persons-change/from-date       from-date
                      :persons-change/count           count}] nil)]
                  {:tx-id tx-id :change-id (first entity-ids)})))))

(defn- handle-delete-residents-count-change! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:persons-change/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Journal-entry handlers (Doppelte Buchführung / FiBu)
;;
;; GoBD: gebuchte Belege sind unveränderlich — kein Update, kein Delete.
;; Korrekturen erfolgen ausschließlich per Storno (Bruttostorno mit
;; getauschten Soll-/Haben-Konten). Belegnummern werden serverseitig
;; fortlaufend und lückenlos vergeben.
;; ---------------------------------------------------------------------------

(defn- next-journal-number [entries]
  (inc (reduce (fn [m e] (max m (or (:journal-entry/number e) 0))) 0 entries)))

(defn- fetch-accounting-onboarding
  "Returns the org's accounting-onboarding entity or nil."
  [storage org-id]
  (js-await [eids ((:find-by-attr storage) :accounting-onboarding/organization-id org-id)]
            (when-let [eid (first eids)]
              ((:pull storage) eid '*))))

(defn- handle-get-all-journal-entries! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids    ((:find-by-attr storage) :journal-entry/organization-id org-id)
                 entries (pull-many+ storage eids '[*])]
                {:journal-entries entries}))))

(defn- handle-create-journal-entry! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [date description debit-account credit-account amount property-id reference]} data]
        (if (or (empty? date) (empty? debit-account) (empty? credit-account)
                (nil? amount) (not (pos? amount)) (= debit-account credit-account))
          {:error :invalid-entry}
          (js-await [onboarding (fetch-accounting-onboarding storage org-id)]
            (if (and onboarding (< date (:accounting-onboarding/date onboarding)))
              ;; GoB: keine Buchungen vor dem Eröffnungsbilanzstichtag
              {:error :before-opening-date}
              (js-await [eids    ((:find-by-attr storage) :journal-entry/organization-id org-id)
                         entries (pull-many+ storage eids '[:journal-entry/number])]
                    (let [number (next-journal-number entries)]
                      (js-await [{:keys [tx-id entity-ids]}
                                 ((:transact! storage)
                                  [(cond-> {:db/type                        "journal-entry"
                                            :journal-entry/organization-id org-id
                                            :journal-entry/number          number
                                            :journal-entry/date            date
                                            :journal-entry/year            (js/parseInt (subs date 0 4))
                                            :journal-entry/description     (or description "")
                                            :journal-entry/debit-account   debit-account
                                            :journal-entry/credit-account  credit-account
                                            :journal-entry/amount          amount
                                            :journal-entry/created-at      (.now js/Date)}
                                     (seq property-id) (assoc :journal-entry/property-id property-id)
                                     (seq reference)   (assoc :journal-entry/reference reference))] nil)]
                                {:tx-id tx-id :entry-id (first entity-ids) :number number}))))))))))

(defn- handle-storno-journal-entry! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (cond
                    (not= (:journal-entry/organization-id entity) org-id)
                    {:error :not-found}

                    (:journal-entry/stornoed entity)
                    {:error :already-stornoed}

                    (some? (:journal-entry/storno-of entity))
                    {:error :is-storno}

                    :else
                    (js-await [eids    ((:find-by-attr storage) :journal-entry/organization-id org-id)
                               entries (pull-many+ storage eids '[:journal-entry/number])]
                              (let [number (next-journal-number entries)]
                                (js-await [{:keys [tx-id entity-ids]}
                                           ((:transact! storage)
                                            [{:db/type                        "journal-entry"
                                              :journal-entry/organization-id org-id
                                              :journal-entry/number          number
                                              :journal-entry/date            (:journal-entry/date entity)
                                              :journal-entry/year            (:journal-entry/year entity)
                                              :journal-entry/description     (str "Storno Beleg Nr. "
                                                                                  (:journal-entry/number entity)
                                                                                  ": " (:journal-entry/description entity))
                                              :journal-entry/debit-account   (:journal-entry/credit-account entity)
                                              :journal-entry/credit-account  (:journal-entry/debit-account entity)
                                              :journal-entry/amount          (:journal-entry/amount entity)
                                              :journal-entry/storno-of       eid
                                              :journal-entry/created-at      (.now js/Date)}
                                             {:db/id                   eid
                                              :journal-entry/stornoed true}] nil)]
                                          {:tx-id tx-id :storno-id (first entity-ids) :number number})))))))))

;; ---------------------------------------------------------------------------
;; Accounting-Onboarding (Eröffnungsbilanz / Saldenvortrag)
;;
;; Einmalige Aufnahme des Buchführungs-Anfangsbestands beim Start der Nutzung.
;; Positionen werden gegen Konto 9000 (Saldenvorträge) eingebucht; die
;; Eröffnungsbilanz muss ausgeglichen sein (Summe Soll = Summe Haben).
;; ---------------------------------------------------------------------------

(defn- handle-get-accounting-onboarding! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [onboarding (fetch-accounting-onboarding storage org-id)
                 ob-eids    ((:find-by-attr storage) :opening-balance/organization-id org-id)
                 balances   (pull-many+ storage ob-eids '[*])]
                {:onboarding       onboarding
                 :opening-balances balances}))))

(defn- handle-complete-accounting-onboarding! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [date positions]} data
            positions (vec (filter #(and (seq (:account %))
                                         (number? (:amount %))
                                         (pos? (:amount %))) positions))
            soll      (transduce (comp (filter #(= (:side %) "S")) (map :amount)) + 0 positions)
            haben     (transduce (comp (filter #(= (:side %) "H")) (map :amount)) + 0 positions)]
        (cond
          (empty? date)
          {:error :invalid-date}

          (> (js/Math.abs (- soll haben)) 0.01)
          {:error :not-balanced}

          :else
          (js-await [existing (fetch-accounting-onboarding storage org-id)]
            (if existing
              {:error :already-completed}
              (js-await [{:keys [tx-id]}
                         ((:transact! storage)
                          (into [{:db/type                              "accounting-onboarding"
                                  :accounting-onboarding/organization-id org-id
                                  :accounting-onboarding/date            date
                                  :accounting-onboarding/completed       true
                                  :accounting-onboarding/created-at      (.now js/Date)}]
                                (map (fn [{:keys [account side amount]}]
                                       {:db/type                        "opening-balance"
                                        :opening-balance/organization-id org-id
                                        :opening-balance/account         account
                                        :opening-balance/side            side
                                        :opening-balance/amount          amount
                                        :opening-balance/date            date})
                                     positions)) nil)]
                        {:tx-id tx-id :ok true}))))))))

;; ---------------------------------------------------------------------------
;; Nebenkosten-Settlement handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-all-nebenkosten-settlements! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids       ((:find-by-attr storage) :nk-settlement/organization-id org-id)
                 settlements (pull-many+ storage eids '[*])]
                {:nebenkosten-settlements settlements}))))

(defn- handle-create-nebenkosten-settlement! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [apartment-id tenant-id year amount date notes]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                       "nk-settlement"
                              :nk-settlement/organization-id org-id
                              :nk-settlement/apartment-id    apartment-id
                              :nk-settlement/tenant-id       tenant-id
                              :nk-settlement/year            year
                              :nk-settlement/amount          amount
                              :nk-settlement/date            date}
                       (seq notes) (assoc :nk-settlement/notes notes))] nil)]
                  {:tx-id tx-id :settlement-id (first entity-ids)})))))

(defn- handle-delete-nebenkosten-settlement! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:nk-settlement/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; NK-Outstanding handlers (Nachzahlung als offen vorgemerkt)
;;
;; Expliziter Vermerk, dass die Nachzahlung eines Abrechnungsjahres offen ist.
;; Der Betrag wird beim Vermerken festgeschrieben und im Folgejahr als offener
;; Posten angezeigt (abzüglich erfasster Zahlungen). Upsert je Whg/Mieter/Jahr.
;; ---------------------------------------------------------------------------

(defn- handle-get-all-nk-outstandings! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids        ((:find-by-attr storage) :nk-outstanding/organization-id org-id)
                 outstandings (pull-many+ storage eids '[*])]
                {:nk-outstandings outstandings}))))

(defn- handle-upsert-nk-outstanding! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [apartment-id tenant-id year amount date]} data]
        (js-await [eids ((:q storage) {:where [['?e :nk-outstanding/apartment-id apartment-id]
                                               ['?e :nk-outstanding/tenant-id tenant-id]
                                               ['?e :nk-outstanding/year year]
                                               ['?e :nk-outstanding/organization-id org-id]]})]
                  (let [eid (or (first eids) (str (random-uuid)))]
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [{:db/id                          eid
                                  :db/type                        "nk-outstanding"
                                  :nk-outstanding/organization-id org-id
                                  :nk-outstanding/apartment-id    apartment-id
                                  :nk-outstanding/tenant-id       tenant-id
                                  :nk-outstanding/year            year
                                  :nk-outstanding/amount          amount
                                  :nk-outstanding/date            date}] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-nk-outstanding! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:nk-outstanding/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

;; ---------------------------------------------------------------------------
;; Tax-income / tax-expense handlers (Anlage V supplemental)
;; ---------------------------------------------------------------------------

(defn- handle-get-all-tax-incomes! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids    ((:find-by-attr storage) :tax-income/organization-id org-id)
                 incomes (pull-many+ storage eids '[*])]
                {:tax-incomes incomes}))))

(defn- handle-create-tax-income! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [property-id year description amount category date]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                     "tax-income"
                              :tax-income/organization-id org-id
                              :tax-income/property-id     property-id
                              :tax-income/year            year
                              :tax-income/description     description
                              :tax-income/amount          amount}
                       (seq category) (assoc :tax-income/category category)
                       (seq date)     (assoc :tax-income/date date))] nil)]
                  {:tx-id tx-id :income-id (first entity-ids)})))))

(defn- handle-delete-tax-income! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:tax-income/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

(defn- handle-get-all-tax-expenses! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids     ((:find-by-attr storage) :tax-expense/organization-id org-id)
                 expenses (pull-many+ storage eids '[*])]
                {:tax-expenses expenses}))))

(defn- handle-create-tax-expense! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [property-id year description amount category date]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                      "tax-expense"
                              :tax-expense/organization-id org-id
                              :tax-expense/property-id     property-id
                              :tax-expense/year            year
                              :tax-expense/description     description
                              :tax-expense/amount          amount}
                       (seq category) (assoc :tax-expense/category category)
                       (seq date)     (assoc :tax-expense/date date))] nil)]
                  {:tx-id tx-id :expense-id (first entity-ids)})))))

(defn- handle-delete-tax-expense! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:tax-expense/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

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

;; ---------------------------------------------------------------------------
;; Garage payment handlers — monthly rent actually received for a garage,
;; mirrors rent-payment but keyed by garage-id.
;; ---------------------------------------------------------------------------

(defn- handle-get-all-garage-payments! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids     ((:find-by-attr storage) :garage-payment/organization-id org-id)
                 payments (pull-many+ storage eids '[*])]
                {:garage-payments payments}))))

(defn- handle-create-garage-payment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [garage-id year month value date description]} data]
        (js-await [garage ((:pull storage) garage-id '*)]
                  (if (not= (:garage/organization-id garage) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id entity-ids]}
                               ((:transact! storage)
                                [(cond-> {:db/type                        "garage-payment"
                                          :garage-payment/organization-id org-id
                                          :garage-payment/garage-id       garage-id
                                          :garage-payment/year            year
                                          :garage-payment/month           month
                                          :garage-payment/value           value}
                                   (some? date)        (assoc :garage-payment/date date)
                                   (some? description) (assoc :garage-payment/description description))] nil)]
                              {:tx-id tx-id :garage-payment-id (first entity-ids)})))))))

(defn- handle-delete-garage-payment! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:garage-payment/organization-id entity) org-id)
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

(defn- handle-admin-extend-trial! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email extra-days]} data
            extra-ms (* (or extra-days 0) 86400000)]
        (if (<= extra-ms 0)
          {:error :invalid-days}
          (js-await [account-eids ((:find-by-attr storage) :account/email email)]
                    (if-let [account-eid (first account-eids)]
                      (js-await [membership (fetch-membership storage account-eid)]
                                (if membership
                                  (let [org-id (:membership/organization-id membership)]
                                    (js-await [org ((:pull storage) org-id '[*])]
                                              (let [current-elapsed (or (:organization/trial-elapsed-ms org) 0)
                                                    new-elapsed     (max 0 (- current-elapsed extra-ms))
                                                    now             (.now js/Date)
                                                    history         (try (js->clj (js/JSON.parse (or (:organization/trial-history org) "[]")) :keywordize-keys false)
                                                                         (catch :default _ []))
                                                    new-hist        (.stringify js/JSON (clj->js (conj history {:type "extend" :ts now :days extra-days})))]
                                                (js-await [_ ((:transact! storage)
                                                              [{:db/id                         org-id
                                                                :organization/trial-elapsed-ms new-elapsed
                                                                :organization/trial-history    new-hist}] nil)]
                                                          (let [updated-org (assoc org
                                                                                   :organization/trial-elapsed-ms new-elapsed
                                                                                   :organization/trial-history    new-hist)]
                                                            {:ok true :trial (compute-trial updated-org)})))))
                                  {:error :not-found}))
                      {:error :not-found})))))))


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

(defn- handle-admin-set-password! [storage data user env]
  (admin-guard user
    (fn []
      (let [{:keys [email password]} data]
        (cond
          (or (nil? password) (< (count password) 8))
          {:error :password-too-short}

          :else
          (js-await [eids ((:find-by-attr storage) :account/email email)]
                    (if-let [account-eid (first eids)]
                      (js-await [hashed (hash-password password (aget env "JWT_SECRET"))
                                 _      ((:transact! storage)
                                         [{:db/id            account-eid
                                           :account/password hashed}] nil)]
                                {:ok true :email email})
                      {:error :not-found})))))))

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

;; ---------------------------------------------------------------------------
;; Feature flags — global catalog + per-organization overrides
;; ---------------------------------------------------------------------------

(defn- ensure-features-seeded!
  "Idempotently inserts any canonical features not yet present in the catalog.
  Writes only when something is missing (normally just the very first call)."
  [storage]
  (js-await [eids     ((:find-by-type storage) "feature")
             existing (pull-many+ storage eids '[:feature/key])]
            (let [have    (set (map :feature/key existing))
                  missing (remove #(have (:key %)) features/canonical-features)
                  now     (.now js/Date)]
              (if (empty? missing)
                (js/Promise.resolve nil)
                ((:transact! storage)
                 (mapv (fn [f]
                         {:db/type             "feature"
                          :feature/key         (:key f)
                          :feature/name        (:name f)
                          :feature/description (:description f)
                          :feature/category    (:category f)
                          :feature/default-on  true
                          :feature/enabled     true
                          :feature/created-at  now})
                       missing) nil)))))

(defn- all-features [storage]
  (js-await [eids ((:find-by-type storage) "feature")
             fs   (pull-many+ storage eids '[*])]
            (vec (sort-by (juxt :feature/category :feature/name) fs))))

(defn- org-feature-overrides [storage org-id]
  (js-await [eids ((:find-by-attr storage) :feature-override/organization-id org-id)
             ovs  (pull-many+ storage eids '[*])]
            (vec ovs)))

(defn- handle-admin-list-features! [storage user]
  (admin-guard user
    (fn []
      (js-await [_  (ensure-features-seeded! storage)
                 fs (all-features storage)]
                {:features fs}))))

(defn- handle-admin-create-feature! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [key name description category default-on]} data
            fkey (some-> key str str/trim)]
        (if (str/blank? fkey)
          {:error :invalid-key}
          (js-await [existing ((:find-by-attr storage) :feature/key fkey)]
                    (if (seq existing)
                      {:error :duplicate-key}
                      (js-await [{:keys [tx-id entity-ids]}
                                 ((:transact! storage)
                                  [{:db/type             "feature"
                                    :feature/key         fkey
                                    :feature/name        (or name fkey)
                                    :feature/description (or description "")
                                    :feature/category    (or category "module")
                                    :feature/default-on  (if (some? default-on) (boolean default-on) true)
                                    :feature/enabled     true
                                    :feature/created-at  (.now js/Date)}] nil)]
                                {:tx-id tx-id :feature-id (first entity-ids)}))))))))

(defn- handle-admin-update-feature! [storage data user]
  (admin-guard user
    (fn []
      (js-await [_ ((:transact! storage)
                    [(cond-> {:db/id (:id data)}
                       (some? (:name data))        (assoc :feature/name        (:name data))
                       (some? (:description data)) (assoc :feature/description (:description data))
                       (some? (:category data))    (assoc :feature/category    (:category data))
                       (some? (:default-on data))  (assoc :feature/default-on  (boolean (:default-on data)))
                       (some? (:enabled data))     (assoc :feature/enabled     (boolean (:enabled data))))] nil)]
                {:ok true}))))

(defn- handle-admin-delete-feature! [storage data user]
  (admin-guard user
    (fn []
      (js-await [_ ((:transact! storage) [[:db/retractEntity (:id data)]] nil)]
                {:ok true}))))

(defn- handle-admin-list-org-features! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email]} data]
        (js-await [account-eids ((:find-by-attr storage) :account/email email)]
                  (if-let [account-eid (first account-eids)]
                    (js-await [membership (fetch-membership storage account-eid)]
                              (if-not membership
                                {:error :not-found}
                                (let [org-id (:membership/organization-id membership)]
                                  (js-await [_   (ensure-features-seeded! storage)
                                             fs  (all-features storage)
                                             ovs (org-feature-overrides storage org-id)]
                                            (let [ov-by-key (into {} (map (fn [o] [(:feature-override/feature-key o) o]) ovs))]
                                              {:email    email
                                               :org-id   org-id
                                               :features (mapv (fn [f]
                                                                 (let [ov (get ov-by-key (:feature/key f))]
                                                                   {:key         (:feature/key f)
                                                                    :name        (:feature/name f)
                                                                    :description (:feature/description f)
                                                                    :category    (:feature/category f)
                                                                    :default-on  (:feature/default-on f)
                                                                    :enabled     (:feature/enabled f)
                                                                    :override    (when ov (:feature-override/enabled ov))
                                                                    :effective   (features/feature-effective? f ov)}))
                                                               fs)})))))
                    {:error :not-found}))))))

(defn- handle-admin-set-org-feature! [storage data user]
  (admin-guard user
    (fn []
      (let [{:keys [email feature-key enabled]} data]
        (js-await [account-eids ((:find-by-attr storage) :account/email email)]
                  (if-let [account-eid (first account-eids)]
                    (js-await [membership (fetch-membership storage account-eid)]
                              (if-not membership
                                {:error :not-found}
                                (let [org-id (:membership/organization-id membership)]
                                  (js-await [eids ((:q storage) {:where [['?e :feature-override/organization-id org-id]
                                                                         ['?e :feature-override/feature-key      feature-key]]})]
                                            (let [existing-eid (first eids)]
                                              (if (nil? enabled)
                                                (if existing-eid
                                                  (js-await [_ ((:excise! storage) existing-eid nil)] {:ok true})
                                                  {:ok true})
                                                (js-await [_ ((:transact! storage)
                                                              [(cond-> {:db/type                          "feature-override"
                                                                        :feature-override/organization-id org-id
                                                                        :feature-override/feature-key     feature-key
                                                                        :feature-override/enabled         (boolean enabled)}
                                                                 existing-eid (assoc :db/id existing-eid))] nil)]
                                                          {:ok true})))))))
                    {:error :not-found}))))))

(defn- handle-get-org-features! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [_   (ensure-features-seeded! storage)
                 fs  (all-features storage)
                 ovs (org-feature-overrides storage org-id)]
                {:features (features/resolve-enabled fs ovs)}))))

(defn- handle-get-public-features!
  "Public, unauthenticated: features effective for visitors (used pre-login,
  e.g. to decide landing page vs. login-first). Read-only — deliberately does
  NOT seed, so the public endpoint never writes."
  [storage]
  (js-await [fs (all-features storage)]
            {:features (features/resolve-public fs)}))

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
;; Bank-account handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-bank-accounts! [storage user]
  (with-org user
    (fn [org-id]
      (js-await [eids     ((:q storage) {:where [['?e :bank-account/organization-id org-id]]})
                 accounts (pull-many+ storage (vec eids) '[*])]
                {:bank-accounts accounts}))))

(defn- handle-create-bank-account! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [iban owner bank-name description]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [(cond-> {:db/type                       "bank-account"
                              :bank-account/organization-id  org-id
                              :bank-account/iban             iban
                              :bank-account/owner            owner
                              :bank-account/bank-name        bank-name}
                       (some? description) (assoc :bank-account/description description))] nil)]
                  {:tx-id tx-id :bank-account-id (first entity-ids)})))))

(defn- handle-update-bank-account! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:bank-account/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id eid}
                                   (some? (:iban data))        (assoc :bank-account/iban (:iban data))
                                   (some? (:owner data))       (assoc :bank-account/owner (:owner data))
                                   (some? (:bank-name data))   (assoc :bank-account/bank-name (:bank-name data))
                                   (some? (:description data)) (assoc :bank-account/description (:description data)))] nil)]
                              {:tx-id tx-id})))))))

(defn- handle-delete-bank-account! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:bank-account/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [_ ((:excise! storage) eid nil)]
                              {:ok true})))))))

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

(defn- run-command! [core storage command data env user]
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
    :get-all-residents-count-changes  (handle-get-all-residents-count-changes! storage user)
    :create-residents-count-change   (handle-create-residents-count-change! storage data user)
    :delete-residents-count-change   (handle-delete-residents-count-change! storage data user)
    :get-all-nebenkosten-settlements (handle-get-all-nebenkosten-settlements! storage user)
    :create-nebenkosten-settlement   (handle-create-nebenkosten-settlement! storage data user)
    :delete-nebenkosten-settlement   (handle-delete-nebenkosten-settlement! storage data user)
    :get-all-nk-outstandings         (handle-get-all-nk-outstandings! storage user)
    :upsert-nk-outstanding           (handle-upsert-nk-outstanding! storage data user)
    :delete-nk-outstanding           (handle-delete-nk-outstanding! storage data user)
    :get-all-tax-incomes             (handle-get-all-tax-incomes! storage user)
    :create-tax-income               (handle-create-tax-income! storage data user)
    :delete-tax-income               (handle-delete-tax-income! storage data user)
    :get-all-tax-expenses            (handle-get-all-tax-expenses! storage user)
    :create-tax-expense              (handle-create-tax-expense! storage data user)
    :delete-tax-expense              (handle-delete-tax-expense! storage data user)
    :get-all-journal-entries         (handle-get-all-journal-entries! storage user)
    :create-journal-entry            (handle-create-journal-entry! storage data user)
    :storno-journal-entry            (handle-storno-journal-entry! storage data user)
    :get-accounting-onboarding       (handle-get-accounting-onboarding! storage user)
    :complete-accounting-onboarding  (handle-complete-accounting-onboarding! storage data user)
    :get-all-tenant-mieten           (handle-get-all-tenant-mieten! storage user)
    :upsert-tenant-miete             (handle-upsert-tenant-miete! storage data user)
    :delete-tenant-miete             (handle-delete-tenant-miete! storage data user)
    :get-all-garages                 (handle-get-all-garages! storage user)
    :create-garage                   (handle-create-garage! core storage data user)
    :update-garage                   (handle-update-garage! core storage data user)
    :delete-garage                   (handle-delete-garage! storage data user)
    :assign-tenant-to-garage         (handle-assign-tenant-to-garage! storage data user)
    :unassign-tenant-from-garage     (handle-unassign-tenant-from-garage! storage data user)
    :get-all-garage-payments         (handle-get-all-garage-payments! storage user)
    :create-garage-payment           (handle-create-garage-payment! storage data user)
    :delete-garage-payment           (handle-delete-garage-payment! storage data user)
    :activate-plan                   (handle-activate-plan! storage data user)
    :list-org-users                  (handle-list-org-users! storage user)
    :create-org-user                 (handle-create-org-user! storage data user env)
    :update-org-user-sections        (handle-update-org-user-sections! storage data user)
    :delete-org-user                 (handle-delete-org-user! storage data user)
    :admin-list-users                (handle-admin-list-users! storage user)
    :admin-set-plan                  (handle-admin-set-plan! storage data user)
    :admin-set-password              (handle-admin-set-password! storage data user env)
    :admin-create-question           (handle-admin-create-question! storage data user)
    :admin-update-question           (handle-admin-update-question! storage data user)
    :admin-delete-question           (handle-admin-delete-question! storage data user)
    :admin-impersonate               (handle-admin-impersonate! storage data user env)
    :admin-list-features             (handle-admin-list-features! storage user)
    :admin-create-feature            (handle-admin-create-feature! storage data user)
    :admin-update-feature            (handle-admin-update-feature! storage data user)
    :admin-delete-feature            (handle-admin-delete-feature! storage data user)
    :admin-list-org-features         (handle-admin-list-org-features! storage data user)
    :admin-set-org-feature           (handle-admin-set-org-feature! storage data user)
    :get-org-features                (handle-get-org-features! storage user)
    :get-public-features             (handle-get-public-features! storage)
    :admin-export                    (handle-admin-export! storage data user)
    :admin-import                    (handle-admin-import! storage data user)
    :pause-trial                     (handle-pause-trial! storage user)
    :resume-trial                    (handle-resume-trial! storage user)
    :admin-pause-trial               (handle-admin-pause-trial! storage data user)
    :admin-resume-trial              (handle-admin-resume-trial! storage data user)
    :admin-extend-trial              (handle-admin-extend-trial! storage data user)
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
    :get-bank-accounts               (handle-get-bank-accounts! storage user)
    :create-bank-account             (handle-create-bank-account! storage data user)
    :update-bank-account             (handle-update-bank-account! storage data user)
    :delete-bank-account             (handle-delete-bank-account! storage data user)
    {:error :unknown-command})))

(defn- trial-access-live? [storage user]
  (let [org-id (:org-id user)]
    (if-not org-id
      (js/Promise.resolve false)
      (js-await [org ((:pull storage) org-id '[*])]
                (let [plan  (:organization/plan org)
                      trial (when (nil? plan) (compute-trial org))]
                  (or (some? plan) (= "active" (:status trial))))))))

(defn- org-feature-blocked?
  "Promise<boolean> — true only when the feature entity exists and resolves to
  off for this org (master switch off, or override/default off). Missing catalog
  data ⇒ not blocked, so an unseeded DB can never lock users out."
  [storage org-id feature-key]
  (js-await [feature-eids ((:find-by-attr storage) :feature/key feature-key)]
            (if-let [feid (first feature-eids)]
              (js-await [feature ((:pull storage) feid '[*])
                         ov-eids ((:q storage) {:where [['?e :feature-override/organization-id org-id]
                                                        ['?e :feature-override/feature-key      feature-key]]})]
                        (if-let [oeid (first ov-eids)]
                          (js-await [override ((:pull storage) oeid '[*])]
                                    (features/feature-blocked? feature override))
                          (features/feature-blocked? feature nil)))
              false)))

(defn- feature-gate
  "Runs f unless the command's mapped feature is disabled for the user's org.
  Super admins and impersonation sessions bypass the gate."
  [storage command user f]
  (let [feature-key (features/command->feature command)]
    (if (or (nil? feature-key)
            (:superadmin user)
            (:impersonated-by user)
            (nil? (:org-id user)))
      (f)
      (js-await [blocked? (org-feature-blocked? storage (:org-id user) feature-key)]
                (if blocked?
                  {:error :feature-disabled :feature feature-key}
                  (f))))))

(defn dispatch [{:keys [core storage command data env user]}]
  (if (and (trial-gated-commands command) (not (trial-access? user)))
    ;; JWT says blocked — re-check DB to handle stale JWT (e.g. trial resumed after last login)
    (js-await [live? (trial-access-live? storage user)]
              (if live?
                (feature-gate storage command user
                              #(run-command! core storage command data env user))
                {:error :trial-expired}))
    (feature-gate storage command user
                  #(run-command! core storage command data env user))))
