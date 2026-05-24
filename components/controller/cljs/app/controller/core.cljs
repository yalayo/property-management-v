(ns app.controller.core
  (:require ["jsonwebtoken" :as jwt]
            [app.worker.async :refer [js-await]]))

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

(defn- fetch-account [storage email]
  (js-await [eids ((:find-by-attr storage) :account/email email)]
            (when-let [eid (first eids)]
              ((:pull storage) eid '*))))

(defn- fetch-membership [storage account-id]
  (js-await [eids ((:find-by-attr storage) :membership/account-id account-id)]
            (when-let [eid (first eids)]
              ((:pull storage) eid '*))))

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
                                                          :account/verified false}] nil)
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
                          (let [org-id (:membership/organization-id membership)
                                role   (:membership/role membership)
                                claims #js {:email   (get-in result [:user :email])
                                            :user-id (get-in result [:user :id])
                                            :org-id  org-id
                                            :role    role
                                            :exp     (+ (js/Math.floor (/ (.now js/Date) 1000)) 86400)}
                                token  (jwt/sign claims (aget env "JWT_SECRET"))]
                            {:token token
                             :user  (assoc (:user result) :org-id org-id :role role)}))
                result))))

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
                        acquisition-date purchase-price current-value]} (:entity result)]
            (js-await [dups ((:q storage) {:where [['?e :property/organization-id org-id]
                                                    ['?e :property/name name]]})]
                      (if (seq dups)
                        {:error :duplicate-name}
                        (js-await [{:keys [tx-id entity-ids]}
                                   ((:transact! storage)
                                    [{:db/type                   "property"
                                      :property/organization-id  org-id
                                      :property/name             name
                                      :property/address          address
                                      :property/city             city
                                      :property/postal-code      postal-code
                                      :property/country          country
                                      :property/units            units
                                      :property/acquisition-date acquisition-date
                                      :property/purchase-price   purchase-price
                                      :property/current-value    current-value}] nil)]
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
                                      purchase-price current-value iban bank-name]} (:updates result)]
                          (js-await [dups ((:q storage) {:where [['?e :property/organization-id org-id]
                                                                   ['?e :property/name name]]})]
                                    (let [conflicts (filter #(not= % eid) (vec dups))]
                                      (if (seq conflicts)
                                        {:error :duplicate-name}
                                        (js-await [{:keys [tx-id]}
                                                   ((:transact! storage)
                                                    [(cond-> {:db/id                   eid
                                                              :property/name           name
                                                              :property/address        address
                                                              :property/city           city
                                                              :property/postal-code    postal-code
                                                              :property/country        country
                                                              :property/units          units
                                                              :property/purchase-price purchase-price
                                                              :property/current-value  current-value}
                                                       iban      (assoc :property/iban      iban)
                                                       bank-name (assoc :property/bank-name bank-name))] nil)]
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
                                    [{:db/type                   "apartment"
                                      :apartment/organization-id org-id
                                      :apartment/property-id     property-id
                                      :apartment/code            code
                                      :apartment/occupied        false}] nil)]
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
                        (let [{:keys [code occupied]} (:updates result)
                              facts (cond-> {:db/id eid}
                                      (some? code)     (assoc :apartment/code code)
                                      (some? occupied) (assoc :apartment/occupied (boolean occupied)))]
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
          (let [{:keys [apartment-id first-name last-name email phone start-date end-date birthday household-members]} (:entity result)]
            (js-await [dups ((:q storage) {:where [['?e :tenant/organization-id org-id]
                                                    ['?e :tenant/first-name first-name]
                                                    ['?e :tenant/last-name last-name]]})]
                      (if (seq dups)
                        {:error :duplicate-name}
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
                                       apartment-id (assoc :tenant/apartment-id apartment-id))] nil)]
                                  {:tx-id tx-id :tenant-id (first entity-ids)})))))))))

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
                        (let [{:keys [first-name last-name email phone start-date end-date birthday household-members kaltmiete nebenkosten-warm]} (:updates result)
                              facts (cond-> {:db/id eid}
                                      (some? first-name)        (assoc :tenant/first-name first-name)
                                      (some? last-name)         (assoc :tenant/last-name last-name)
                                      (some? email)             (assoc :tenant/email email)
                                      (some? phone)             (assoc :tenant/phone phone)
                                      (some? start-date)        (assoc :tenant/start-date start-date)
                                      (some? end-date)          (assoc :tenant/end-date end-date)
                                      (some? birthday)          (assoc :tenant/birthday birthday)
                                      (some? household-members) (assoc :tenant/household-members household-members)
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
      (let [{:keys [property-id line name year value]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type              "cost"
                      :cost/organization-id  org-id
                      :cost/property-id      property-id
                      :cost/line             line
                      :cost/name             name
                      :cost/year             year
                      :cost/value            value}] nil)]
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
      (let [{:keys [apartment-id year month value date description]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type                      "rent-payment"
                      :rent-payment/organization-id  org-id
                      :rent-payment/apartment-id     apartment-id
                      :rent-payment/year             year
                      :rent-payment/month            month
                      :rent-payment/value            value
                      :rent-payment/date             date
                      :rent-payment/description      description}] nil)]
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
                                [{:db/id               eid
                                  :rent-payment/value  (:value data)}] nil)]
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
                    [{:db/type                      "apartment-cost"
                      :apartment-cost/organization-id org-id
                      :apartment-cost/apartment-id    apartment-id
                      :apartment-cost/line             line
                      :apartment-cost/name             name
                      :apartment-cost/year             year
                      :apartment-cost/value          value
                      :apartment-cost/verteiler      verteiler
                      :apartment-cost/anteil         anteil
                      :apartment-cost/schluessel     schluessel}] nil)]
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
                                [{:db/id                  eid
                                  :apartment-cost/value        (:value data)
                                  :apartment-cost/verteiler    (:verteiler data)
                                  :apartment-cost/anteil       (:anteil data)
                                  :apartment-cost/schluessel   (:schluessel data)}] nil)]
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
      (js-await [eids          ((:find-by-attr storage) :expense-type/organization-id org-id)
                 expense-types (pull-many+ storage eids '[*])]
                {:expense-types expense-types}))))

(defn- handle-create-expense-type! [storage data user]
  (with-org user
    (fn [org-id]
      (let [{:keys [key name-en name-de]} data]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type                      "expense-type"
                      :expense-type/organization-id org-id
                      :expense-type/key             key
                      :expense-type/name-en         name-en
                      :expense-type/name-de         name-de}] nil)]
                  {:tx-id tx-id :expense-type-id (first entity-ids)})))))

(defn- handle-update-expense-type! [storage data user]
  (with-org user
    (fn [org-id]
      (let [eid (:id data)]
        (js-await [entity ((:pull storage) eid '*)]
                  (if (not= (:expense-type/organization-id entity) org-id)
                    {:error :not-found}
                    (js-await [{:keys [tx-id]}
                               ((:transact! storage)
                                [(cond-> {:db/id eid}
                                   (:name-en data) (assoc :expense-type/name-en (:name-en data))
                                   (:name-de data) (assoc :expense-type/name-de (:name-de data)))] nil)]
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
;; Dispatcher
;; ---------------------------------------------------------------------------

(defn dispatch [{:keys [core storage command data env user]}]
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
    {:error :unknown-command}))
