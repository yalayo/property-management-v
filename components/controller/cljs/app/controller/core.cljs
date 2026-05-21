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
  (let [org-id (:org-id user)]
    (js-await [eids       ((:find-by-attr storage) :property/organization-id org-id)
               properties (pull-many+ storage eids '[*])]
              {:properties properties})))

(defn- handle-create-property! [core storage data user]
  (let [org-id (:org-id user)
        result ((:process core) {:command :create-property :data data})]
    (if (:error result)
      result
      (let [{:keys [name address city postal-code country units
                    acquisition-date purchase-price current-value]} (:entity result)]
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
                  {:tx-id tx-id :property-id (first entity-ids)})))))

(defn- handle-update-property! [core storage data user]
  (let [eid    (:id data)
        org-id (:org-id user)]
    (js-await [entity ((:pull storage) eid '*)]
              (if (not= (:property/organization-id entity) org-id)
                {:error :not-found}
                (let [result ((:process core) {:command :update-property :data data})]
                  (if (:error result)
                    result
                    (let [{:keys [name address city postal-code country units
                                  purchase-price current-value]} (:updates result)]
                      (js-await [{:keys [tx-id]}
                                 ((:transact! storage)
                                  [{:db/id                   eid
                                    :property/name           name
                                    :property/address        address
                                    :property/city           city
                                    :property/postal-code    postal-code
                                    :property/country        country
                                    :property/units          units
                                    :property/purchase-price purchase-price
                                    :property/current-value  current-value}] nil)]
                                {:tx-id tx-id}))))))))

(defn- handle-delete-property! [storage data user]
  (let [eid    (:id data)
        org-id (:org-id user)]
    (js-await [entity ((:pull storage) eid '*)]
              (if (not= (:property/organization-id entity) org-id)
                {:error :not-found}
                (js-await [_ ((:excise! storage) eid nil)]
                          {:ok true})))))

;; ---------------------------------------------------------------------------
;; Apartment handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-apartments! [storage user]
  (let [org-id (:org-id user)]
    (js-await [eids       ((:find-by-attr storage) :apartment/organization-id org-id)
               apartments (pull-many+ storage eids '[*])]
              {:apartments apartments})))

(defn- handle-get-apartments-by-property! [storage data user]
  (let [property-id (:property-id data)
        org-id      (:org-id user)]
    (js-await [eids       ((:q storage) {:where [['?e :apartment/property-id property-id]
                                                  ['?e :apartment/organization-id org-id]]})
               apartments (pull-many+ storage (vec eids) '[*])]
              {:apartments apartments})))

(defn- handle-create-apartment! [core storage data user]
  (let [org-id (:org-id user)
        result ((:process core) {:command :create-apartment :data data})]
    (if (:error result)
      result
      (let [{:keys [property-id code]} (:entity result)]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type                   "apartment"
                      :apartment/organization-id org-id
                      :apartment/property-id     property-id
                      :apartment/code            code
                      :apartment/occupied        false}] nil)]
                  {:tx-id tx-id :apartment-id (first entity-ids)})))))

(defn- handle-update-apartment! [core storage data user]
  (let [eid    (:id data)
        org-id (:org-id user)]
    (js-await [entity ((:pull storage) eid '*)]
              (if (not= (:apartment/organization-id entity) org-id)
                {:error :not-found}
                (let [result ((:process core) {:command :update-apartment :data data})]
                  (if (:error result)
                    result
                    (let [{:keys [code occupied]} (:updates result)]
                      (js-await [{:keys [tx-id]}
                                 ((:transact! storage)
                                  [{:db/id              eid
                                    :apartment/code     code
                                    :apartment/occupied (boolean occupied)}] nil)]
                                {:tx-id tx-id}))))))))

(defn- handle-delete-apartment! [storage data user]
  (let [eid    (:id data)
        org-id (:org-id user)]
    (js-await [entity ((:pull storage) eid '*)]
              (if (not= (:apartment/organization-id entity) org-id)
                {:error :not-found}
                (js-await [_ ((:excise! storage) eid nil)]
                          {:ok true})))))

(defn- handle-get-onboardings! [storage user]
  (let [org-id (:org-id user)]
    (js-await [eids        ((:find-by-attr storage) :onboarding/organization-id org-id)
               onboardings (pull-many+ storage eids '[*])]
              {:onboardings onboardings})))

(defn- handle-get-onboarding! [storage data user]
  (let [apartment-id (:apartment-id data)
        org-id       (:org-id user)]
    (js-await [eids ((:q storage) {:where [['?e :onboarding/apartment-id apartment-id]
                                            ['?e :onboarding/organization-id org-id]]})]
              (if-let [eid (first eids)]
                (js-await [onboarding ((:pull storage) eid '*)]
                          {:onboarding onboarding})
                {:onboarding nil}))))

(defn- handle-start-onboarding! [core storage data user]
  (let [org-id (:org-id user)
        result ((:process core) {:command :start-onboarding :data data})]
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
                  {:tx-id tx-id :onboarding-id (first entity-ids)})))))

;; ---------------------------------------------------------------------------
;; Tenant handlers
;; ---------------------------------------------------------------------------

(defn- handle-get-tenants! [storage user]
  (let [org-id (:org-id user)]
    (js-await [eids    ((:find-by-attr storage) :tenant/organization-id org-id)
               tenants (pull-many+ storage eids '[*])]
              {:tenants tenants})))

(defn- handle-get-tenants-by-apartment! [storage data user]
  (let [apartment-id (:apartment-id data)
        org-id       (:org-id user)]
    (js-await [eids    ((:q storage) {:where [['?e :tenant/apartment-id apartment-id]
                                               ['?e :tenant/organization-id org-id]]})
               tenants (pull-many+ storage (vec eids) '[*])]
              {:tenants tenants})))

(defn- handle-create-tenant! [core storage data user]
  (let [org-id (:org-id user)
        result ((:process core) {:command :create-tenant :data data})]
    (if (:error result)
      result
      (let [{:keys [apartment-id name email phone start-date end-date]} (:entity result)]
        (js-await [{:keys [tx-id entity-ids]}
                   ((:transact! storage)
                    [{:db/type                  "tenant"
                      :tenant/organization-id   org-id
                      :tenant/apartment-id      apartment-id
                      :tenant/name              name
                      :tenant/email             email
                      :tenant/phone             phone
                      :tenant/start-date        start-date
                      :tenant/end-date          end-date}] nil)]
                  {:tx-id tx-id :tenant-id (first entity-ids)})))))

(defn- handle-update-tenant! [core storage data user]
  (let [eid    (:id data)
        org-id (:org-id user)]
    (js-await [entity ((:pull storage) eid '*)]
              (if (not= (:tenant/organization-id entity) org-id)
                {:error :not-found}
                (let [result ((:process core) {:command :update-tenant :data data})]
                  (if (:error result)
                    result
                    (let [{:keys [name email phone start-date end-date]} (:updates result)]
                      (js-await [{:keys [tx-id]}
                                 ((:transact! storage)
                                  [{:db/id             eid
                                    :tenant/name       name
                                    :tenant/email      email
                                    :tenant/phone      phone
                                    :tenant/start-date start-date
                                    :tenant/end-date   end-date}] nil)]
                                {:tx-id tx-id}))))))))

(defn- handle-delete-tenant! [storage data user]
  (let [eid    (:id data)
        org-id (:org-id user)]
    (js-await [entity ((:pull storage) eid '*)]
              (if (not= (:tenant/organization-id entity) org-id)
                {:error :not-found}
                (js-await [_ ((:excise! storage) eid nil)]
                          {:ok true})))))

;; ---------------------------------------------------------------------------
;; Dispatcher
;; ---------------------------------------------------------------------------

(defn dispatch [{:keys [core storage command data env user]}]
  (case command
    :user-sign-up                 (handle-sign-up! core storage data env)
    :user-sign-in                 (handle-sign-in! core storage data env)
    :get-properties               (handle-get-properties! storage user)
    :create-property              (handle-create-property! core storage data user)
    :update-property              (handle-update-property! core storage data user)
    :delete-property              (handle-delete-property! storage data user)
    :get-apartments               (handle-get-apartments! storage user)
    :get-apartments-by-property   (handle-get-apartments-by-property! storage data user)
    :create-apartment             (handle-create-apartment! core storage data user)
    :update-apartment             (handle-update-apartment! core storage data user)
    :delete-apartment             (handle-delete-apartment! storage data user)
    :get-onboardings              (handle-get-onboardings! storage user)
    :get-onboarding               (handle-get-onboarding! storage data user)
    :start-onboarding             (handle-start-onboarding! core storage data user)
    :get-tenants                  (handle-get-tenants! storage user)
    :get-tenants-by-apartment     (handle-get-tenants-by-apartment! storage data user)
    :create-tenant                (handle-create-tenant! core storage data user)
    :update-tenant                (handle-update-tenant! core storage data user)
    :delete-tenant                (handle-delete-tenant! storage data user)
    {:error :unknown-command}))
